"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/app/controls";
export function SubmitButton({ children }: { children: string }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? "Signing in…" : children}</Button>; }
