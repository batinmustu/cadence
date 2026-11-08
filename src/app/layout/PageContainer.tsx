import type { ReactNode } from "react";

/** The one standard content width for every screen (token `--content-width`). */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div data-slot="page-container" className="mx-auto w-full max-w-[var(--content-width)]">
      {children}
    </div>
  );
}
