import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "../../scripts/db/schema";
import { requireStaff } from "./access";

export async function listResources(workshopId: string) {
  await requireStaff(workshopId);
  return db.select({ id: resources.id, name: resources.name, type: resources.type, active: resources.active })
    .from(resources).where(eq(resources.workshopId, workshopId)).orderBy(resources.type, resources.name);
}
