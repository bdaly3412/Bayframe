"use client";
export default function Error({ reset }: { reset: () => void }) { return <main id="main" className="workspace"><h1>Workshop records unavailable</h1><p role="alert">The server could not load the records. Check that local services are running, then retry.</p><button onClick={reset}>Retry</button></main>; }
