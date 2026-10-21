"use client";
import { Brand } from "../brand";
import { Button, Feedback } from "../controls";
export default function Error({ reset }: { reset: () => void }) { return <main id="main" tabIndex={-1} className="customer-shell"><Brand /><section className="panel"><h1>Staff service unavailable</h1><Feedback>Check that the local database and authentication service are running, then retry. No records were loaded.</Feedback><Button onClick={reset}>Retry</Button></section></main>; }
