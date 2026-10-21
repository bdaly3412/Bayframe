"use client";

import { useEffect, useRef, useState } from "react";
import { readDecision, submitDecision, type ActionResult } from "../actions";
import { Button, Feedback } from "@/app/controls";
import { money } from "@/workshop/rules";
import { Table } from "../table";

type PreviewResult = Awaited<ReturnType<typeof readDecision>>;
export function Decision() {
  const token = useRef("");
  const [loaded, setLoaded] = useState<{ token: string; result: PreviewResult }>();
  const [feedback, setFeedback] = useState<ActionResult>();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    function load() {
      const value = window.location.hash.slice(1) || token.current;
      token.current = value;
      history.replaceState(null, "", window.location.pathname);
      readDecision(value).then((result) => {
        if (active && token.current === value) { setLoaded({ token: value, result }); setFeedback(undefined); }
      }).catch(() => {
        if (active && token.current === value) setLoaded({ token: value, result: { error: "The estimate could not be loaded. Reopen your link and try again." } });
      });
    }
    load();
    window.addEventListener("hashchange", load);
    return () => { active = false; window.removeEventListener("hashchange", load); };
  }, []);
  async function decide(decision: "accepted" | "rejected") {
    if (!loaded || pending || loaded.token !== token.current) return;
    const selected = loaded;
    if (!window.confirm(decision === "accepted" ? "Accept this exact estimate and authorize the listed work?" : "Reject this estimate?")) return;
    setPending(true);
    setFeedback(undefined);
    try {
      const response = await submitDecision(selected.token, decision);
      if (token.current !== selected.token) return;
      setFeedback(response);
      if (response.success) {
        const result = await readDecision(selected.token);
        if (token.current === selected.token) setLoaded({ token: selected.token, result });
      }
    } catch {
      if (token.current === selected.token) setFeedback({ success: false, message: "Connection failed. Reopen the link to check whether your decision was recorded before trying again." });
    } finally { setPending(false); }
  }
  const result = loaded?.result;
  if (!result) return <div className="panel" role="status" aria-busy="true">Loading estimate…</div>;
  if (result.error) return <Feedback>{result.error}</Feedback>;
  const estimate = result.preview!;
  return <section aria-labelledby="estimate-heading">
    <header className="section-header"><h2 id="estimate-heading">Estimate version {estimate.version}</h2><span className="status" data-state={estimate.state}>{estimate.state}</span></header>
    <Table regionLabel="Estimate line items" className="decision-table"><caption>Exact issued scope, GBP excluding VAT</caption><thead><tr><th scope="col">Description</th><th scope="col" className="num">Quantity</th><th scope="col" className="num">Unit price</th></tr></thead><tbody>{estimate.lines.map((line, i) => <tr key={i}><td>{line.description}</td><td className="num">{line.quantity}</td><td className="num">{money(line.unitPrice)}</td></tr>)}</tbody></Table>
    <dl className="money-summary"><div><dt>Net</dt><dd>{money(estimate.net)}</dd></div><div><dt>VAT at 20%</dt><dd>{money(estimate.tax)}</dd></div><div className="total"><dt>Total</dt><dd>{money(estimate.total)}</dd></div></dl>
    <p className="muted">Expires {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(estimate.expiresAt!))} (Europe/London).</p>
    {estimate.state === "issued" && <p className="decision-consequence">Accepting authorizes only the listed work. Rejecting does not authorize it.</p>}
    {estimate.state === "issued" ? <div className="choice-row" aria-busy={pending}><Button tone="secondary" disabled={pending} onClick={() => decide("accepted")}>Accept and authorize work</Button><Button tone="secondary" disabled={pending} onClick={() => decide("rejected")}>Reject estimate</Button>{pending && <p role="status">Recording your decision…</p>}</div> : <p>This estimate is {estimate.state}. No further decision is available on this version.</p>}
    {feedback && <Feedback success={feedback.success}>{feedback.message}</Feedback>}
  </section>;
}
