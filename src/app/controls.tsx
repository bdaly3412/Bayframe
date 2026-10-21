"use client";

import MuiButton, { type ButtonProps } from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { ReactNode } from "react";

export function Button({ tone = "primary", className = "", ...props }: ButtonProps & { tone?: "primary" | "secondary" | "danger" }) {
  return <MuiButton disableElevation disableRipple className={`bf-button ${className}`} data-tone={tone} {...props} />;
}

export function Feedback({ success = false, children }: { success?: boolean; children: ReactNode }) {
  return <Alert icon={false} severity={success ? "success" : "error"} role={success ? "status" : "alert"} data-outcome={success ? "success" : "error"} className="feedback">{children}</Alert>;
}
