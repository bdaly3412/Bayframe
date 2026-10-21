import Link from "next/link";

export function Brand() {
  return <Link href="/" className="brand" aria-label="Bayframe home"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M11 4H4v20h7M17 4h7v20h-7M4 14h20" stroke="currentColor" strokeWidth="2" /></svg><span>Bayframe</span></Link>;
}
