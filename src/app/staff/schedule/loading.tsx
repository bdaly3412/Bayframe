import { Brand } from "../../brand";
export default function Loading() { return <main id="main" tabIndex={-1} className="customer-shell"><Brand /><div className="panel"><h1>Workshop operations</h1><p role="status" className="lead">Loading workshop records…</p><div className="loading-lines" aria-hidden="true"><span /><span /><span /></div></div></main>; }
