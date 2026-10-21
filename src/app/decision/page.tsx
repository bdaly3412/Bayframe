import type { Metadata } from "next";
import { Brand } from "@/app/brand";
import { Decision } from "./view";

export const metadata: Metadata = { title: "Estimate decision · Bayframe", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function DecisionPage() {
  return <main id="main" tabIndex={-1} className="customer-shell">
    <header className="customer-header"><Brand /><span className="muted">Customer estimate</span></header>
    <div className="customer-layout">
      <div className="customer-content"><header className="page-header"><h1>Review your estimate</h1><p className="lead">Review the listed work and total before recording your decision.</p></header><Decision /></div>
      <aside className="customer-aside"><h2>Your decision</h2><p>Acceptance authorizes only the work listed in this exact estimate version. Rejection does not authorize that work.</p><p>This private link expires 48 hours after issue. Share it only with the booking contact.</p><p className="demo-note">Local workshop demonstration. No payment is taken here.</p></aside>
    </div>
  </main>;
}
