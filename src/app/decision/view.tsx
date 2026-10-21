"use client";
import { useEffect, useRef, useState } from "react";
import { readDecision, submitDecision } from "../actions";
import { money } from "@/workshop/rules";

type PreviewResult = Awaited<ReturnType<typeof readDecision>>;
export function Decision() {
  const token = useRef("");
  const initialized = useRef(false);
  const [result, setResult] = useState<PreviewResult>(), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value = window.location.hash.slice(1); token.current = value;
    history.replaceState(null, "", window.location.pathname);
    readDecision(value).then(setResult).catch(() => setResult({ error: "The estimate could not be loaded. Reopen your link and try again." }));
  }, []);
  async function decide(decision: "accepted" | "rejected") {
    if (pending) return;
    if (!window.confirm(decision === "accepted" ? "Accept this exact estimate and authorize the listed work?" : "Reject this estimate?")) return;
    setPending(true);
    try {
      const response = await submitDecision(token.current, decision); setMessage(response.message);
      if (response.success) setResult(await readDecision(token.current));
    } catch { setMessage("Connection failed. Reopen the link to check whether your decision was recorded before trying again."); }
    finally { setPending(false); }
  }
  if (!result) return <p role="status">Loading estimate…</p>;
  if (result.error) return <p role="alert" className="error">{result.error}</p>;
  const estimate = result.preview!;
  return <section><h2>Estimate version {estimate.version}</h2><p className="status">{estimate.state}</p><div className="table-scroll"><table><caption>Exact issued scope, GBP excluding VAT</caption><thead><tr><th scope="col">Description</th><th scope="col">Quantity</th><th scope="col">Unit price</th></tr></thead><tbody>{estimate.lines.map((line, i) => <tr key={i}><td>{line.description}</td><td>{line.quantity}</td><td>{money(line.unitPrice)}</td></tr>)}</tbody></table></div><p>Net {money(estimate.net)} · VAT at 20% {money(estimate.tax)}</p><p className="total">Total {money(estimate.total)}</p><p>Expires {new Date(estimate.expiresAt!).toLocaleString("en-GB", { timeZone: "Europe/London" })} (Europe/London).</p>
    {estimate.state === "issued" && <div className="actions"><button disabled={pending} onClick={() => decide("accepted")}>Accept and authorize work</button><button disabled={pending} onClick={() => decide("rejected")}>Reject estimate</button></div>}
    {message && <p role="status" className="notice">{message}</p>}
  </section>;
}
