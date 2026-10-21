import { Brand } from "../brand";
export default function Loading() { return <main id="main" tabIndex={-1} className="customer-shell"><Brand /><div className="panel"><h1>Workshop operations</h1><p role="status" className="lead">Checking staff access and loading records…</p><div className="loading-lines" aria-hidden="true"><span /><span /><span /></div></div></main>; }
