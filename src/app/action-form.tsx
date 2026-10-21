"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { runAction, type ActionResult } from "./actions";
import { Button, Feedback } from "./controls";

export function ActionForm({ command, workshopId, id, label, children, reset = false }: { command: string; workshopId: string; id?: string; label: string; children?: ReactNode; reset?: boolean }) {
  const [result, setResult] = useState<ActionResult>(), [pending, setPending] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackId = useId();
  const saving = useRef(false);
  const router = useRouter();
  useEffect(() => {
    const fields = result?.fields ?? [];
    const controls = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([type=hidden]), select");
    controls?.forEach((control) => {
      const invalid = fields.includes(control.name);
      control.setAttribute("aria-invalid", String(invalid));
      const describedBy = (control.getAttribute("aria-describedby") ?? "").split(" ").filter((id) => id && id !== feedbackId);
      if (invalid) describedBy.push(feedbackId);
      if (describedBy.length) control.setAttribute("aria-describedby", describedBy.join(" "));
      else control.removeAttribute("aria-describedby");
    });
    if (result && !result.success) feedback.current?.focus();
  }, [result, feedbackId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || result?.link) return;
    if (["cancel", "reject"].includes(command) && !window.confirm(command === "cancel" ? "Cancel this booking and release its reservations?" : "Reject this appointment request?")) return;
    const form = event.currentTarget, data = new FormData(form);
    saving.current = true;
    setPending(true); setResult(undefined);
    try {
      const response = await runAction(data); setResult(response);
      if (response.success) { if (reset) form.reset(); if (!response.link) router.refresh(); }
    } catch { setResult({ success: false, message: "The connection failed. Your input is preserved. Try again." }); }
    finally { saving.current = false; setPending(false); }
  }
  return <form ref={formRef} onSubmit={submit} className="action-form" aria-label={label} aria-busy={pending}>
    <input type="hidden" name="command" value={command} /><input type="hidden" name="workshopId" value={workshopId} />{id && <input type="hidden" name="id" value={id} />}
    <fieldset disabled={pending || Boolean(result?.link)}>{children}<Button type="submit" tone={["cancel", "reject"].includes(command) ? "danger" : "primary"}>{pending ? "Saving…" : label}</Button></fieldset>
    {result && <div id={feedbackId} ref={feedback} tabIndex={-1}><Feedback success={result.success}>{result.message}{result.fields?.map((name) => <p key={name}><button type="button" className="field-error-link" onClick={() => { const control = formRef.current?.elements.namedItem(name); if (control instanceof HTMLElement) control.focus(); }}>Correct {name === "startAt" ? "requested start time" : name}</button></p>)}{result.link && <><p><a href={result.link}>Customer decision link</a><br /><input aria-label="Copy decision link" readOnly value={typeof window === "undefined" ? result.link : window.location.origin + result.link} onFocus={(event) => event.target.select()} /></p><p>Copy the link before updating records. It will disappear when the page refreshes.</p><Button type="button" tone="secondary" onClick={() => router.refresh()}>Refresh after copying link</Button></>}</Feedback></div>}
  </form>;
}
