"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, StaffAccessError } from "@/auth/access";
import { absoluteTime, uuid, WorkflowError } from "@/workshop/rules";
import { addTask, allocate, availability, cancelBooking, checkIn, createEstimate, createRequest, decideEstimate, issueEstimate, previewDecision, recordAbsence, updateWork } from "@/workshop/service";

export type ActionResult = { success: boolean; message: string; link?: string; fields?: string[] };
function safeMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((i) => `${i.path.join(".") || "Input"}: ${i.message}`).join("; ");
  if (error instanceof WorkflowError || error instanceof StaffAccessError) return error.message;
  console.error(JSON.stringify({ operation: "workshop-action", outcome: "failed", correlationId: crypto.randomUUID() }));
  return "The operation failed. Refresh the page and try again. No success is confirmed.";
}
export async function runAction(data: FormData): Promise<ActionResult> {
  try {
    const command = z.enum(["request", "availability", "confirm", "reschedule", "cancel", "reject", "check-in", "add-task", "start", "complete", "close", "task", "draft", "issue", "absence"]).parse(data.get("command"));
    const workshopId = uuid.parse(data.get("workshopId"));
    const text = (name: string) => z.string().parse(data.get(name));
    let message = "Saved.", link: string | undefined;
    if (command === "request") {
      const id = await createRequest({ workshopId, name: text("name"), email: text("email"), registration: text("registration"), startAt: text("startAt") });
      message = `Request received. Reference ${id}. Staff must confirm it before any resources are reserved.`;
    } else if (command === "availability") {
      const result = await availability(workshopId, text("startAt"));
      message = `${result.bays} bay(s) and ${result.technicians} technician(s) currently available. This is advisory, not a reservation.`;
    } else {
      const actor = await requireStaff(workshopId, ["start", "complete", "task"].includes(command) ? ["manager", "adviser", "technician"] : command === "absence" ? ["manager"] : ["manager", "adviser"]);
      const id = command === "absence" ? "" : uuid.parse(data.get("id"));
      switch (command) {
        case "confirm": case "reschedule":
          await allocate(actor, { bookingId: id, bayId: uuid.parse(data.get("bayId")), technicianId: uuid.parse(data.get("technicianId")), ...(command === "reschedule" ? { startAt: absoluteTime.parse(data.get("startAt")) } : {}) }); break;
        case "cancel": case "reject": await cancelBooking(actor, id, command === "reject"); break;
        case "check-in": await checkIn(actor, id); break;
        case "add-task": await addTask(actor, id, text("description")); break;
        case "start": case "complete": case "close": case "task": await updateWork(actor, id, command, command === "task" ? uuid.parse(data.get("taskId")) : undefined); break;
        case "draft": {
          const quantity = z.coerce.number().int().min(1).max(1000).parse(data.get("quantity"));
          const price = z.string().regex(/^\d{1,5}(\.\d{1,2})?$/, "Enter a price in pounds with at most two decimals.").parse(data.get("price"));
          const [whole, fraction = ""] = price.split(".");
          const unitPrice = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
          await createEstimate(actor, id, [{ description: text("description"), quantity, unitPrice }]); break;
        }
        case "issue": link = `/decision#${await issueEstimate(actor, id)}`; message = "Estimate issued for 48 hours. Copy this link for the booking contact; it is shown only now."; break;
        case "absence": await recordAbsence(actor, uuid.parse(data.get("resourceId")), absoluteTime.parse(data.get("startAt")), absoluteTime.parse(data.get("endAt"))); break;
      }
    }
    if (!link) revalidatePath("/staff/schedule");
    return { success: true, message, ...(link ? { link } : {}) };
  } catch (error) {
    const fields = error instanceof z.ZodError ? [...new Set(error.issues.flatMap((issue) => typeof issue.path[0] === "string" ? [issue.path[0]] : []))] : [];
    return { success: false, message: safeMessage(error), ...(fields.length ? { fields } : {}) };
  }
}

export async function readDecision(token: string) {
  try { return { preview: await previewDecision(token) }; }
  catch (error) { return { error: safeMessage(error) }; }
}
export async function submitDecision(token: string, decision: "accepted" | "rejected"): Promise<ActionResult> {
  try {
    const result = await decideEstimate(token, decision);
    revalidatePath("/staff/schedule");
    return { success: true, message: result === "already-recorded" ? "This decision was already recorded." : `Your decision was recorded: ${decision}.` };
  } catch (error) { return { success: false, message: safeMessage(error) }; }
}
