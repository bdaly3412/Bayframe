"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Feedback } from "@/app/controls";
import { SubmitButton } from "@/app/submit-button";
import { login } from "./actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, action, pending] = useActionState(login, "");
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error && !pending) feedback.current?.focus(); }, [error, pending]);
  return <form action={action} className="form-grid">
    {error && <div className="full-width" ref={feedback} tabIndex={-1}><Feedback>{error}</Feedback></div>}
    <label className="full-width">Email<input name="email" type="email" autoComplete="username" spellCheck={false} required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label className="full-width">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
    <div className="full-width"><SubmitButton>Sign in</SubmitButton></div>
  </form>;
}
