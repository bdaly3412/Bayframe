"use client";
export default function Error({ reset }: { reset: () => void }) { return <main id="main" className="workspace"><h1>Staff service unavailable</h1><p role="alert">Check that the local database and authentication service are running, then retry.</p><button onClick={reset}>Retry</button></main>; }
