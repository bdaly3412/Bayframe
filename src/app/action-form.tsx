"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { runAction, type ActionResult } from "./actions";

export function ActionForm({ command, workshopId, id, label, children, reset = false }: { command: string; workshopId: string; id?: string; label: string; children?: ReactNode; reset?: boolean }) {
  const [result, setResult] = useState<ActionResult>(), [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || result?.link) return;
    const form = event.currentTarget, data = new FormData(form);
    setPending(true); setResult(undefined);
    try {
      const response = await runAction(data); setResult(response);
      if (response.success) { if (reset) form.reset(); if (!response.link) router.refresh(); }
    } catch { setResult({ success: false, message: "The connection failed. Your input is preserved. Try again." }); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="action-form">
    <input type="hidden" name="command" value={command} /><input type="hidden" name="workshopId" value={workshopId} />{id && <input type="hidden" name="id" value={id} />}
    <fieldset disabled={pending || Boolean(result?.link)}>{children}<button type="submit">{pending ? "Saving…" : label}</button></fieldset>
    {result && <div role={result.success ? "status" : "alert"} className={result.success ? "notice" : "error"}>{result.message}{result.link && <p><a href={result.link}>Customer decision link</a><br /><input aria-label="Copy decision link" readOnly value={typeof window === "undefined" ? result.link : window.location.origin + result.link} onFocus={(event) => event.target.select()} /></p>}</div>}
  </form>;
}
