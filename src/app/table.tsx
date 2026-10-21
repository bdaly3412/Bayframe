import type { ComponentProps } from "react";

export function Table({ regionLabel, className = "", ...props }: ComponentProps<"table"> & { regionLabel: string }) {
  return <div data-slot="table-container" className="table-scroll" tabIndex={0} role="region" aria-label={regionLabel}><table data-slot="table" className={className} {...props} /></div>;
}
