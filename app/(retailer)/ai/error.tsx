"use client";

import Link from "next/link";
import { RotateCcw, Store } from "lucide-react";

export default function AiOrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="eyebrow">AI order capture</p>
      <h1 className="display mt-2 text-[1.8rem] leading-tight">
        The AI desk could not load.
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Your cart is safe. Retry the page, or order from the catalogue while the
        AI service recovers.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[0.625rem] text-ink-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link href="/shop" className="btn btn-secondary">
          <Store className="h-4 w-4" /> Browse catalogue
        </Link>
      </div>
    </div>
  );
}
