import Link from "next/link";
import type { Metadata } from "next";
import { Decision } from "./view";
export const metadata: Metadata = { title: "Estimate decision · Bayframe", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function DecisionPage() { return <main id="main" tabIndex={-1} className="workspace narrow"><Link href="/">Bayframe</Link><p className="eyebrow">Booking contact · Restricted decision</p><h1>Review your estimate</h1><p>This link authorizes a decision on one estimate version. Share it only with the booking contact. It expires 48 hours after issue.</p><Decision /></main>; }
