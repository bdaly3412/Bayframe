"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children }: { children: string }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending}>{pending ? "Please wait…" : children}</button>; }
