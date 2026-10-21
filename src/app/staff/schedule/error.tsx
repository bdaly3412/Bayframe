"use client";
import { Brand } from "../../brand";
import { Button, Feedback } from "../../controls";
export default function Error({ reset }: { reset: () => void }) { return <main id="main" tabIndex={-1} className="customer-shell"><Brand /><section className="panel"><h1>Workshop records unavailable</h1><Feedback>The server could not load the records. Check that local services are running, then retry.</Feedback><Button onClick={reset}>Retry</Button></section></main>; }
