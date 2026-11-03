"use client";

import { RotateCcw } from "lucide-react";

export default function DeskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="eyebrow">Order desk</p>
      <h1 className="display mt-2 text-2xl">The desk could not load.</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Orders and stock are untouched. Retry the page; if the database is
        briefly unavailable, the queue will reappear when it recovers.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[0.625rem] text-ink-muted">
          Reference: {error.digest}
        </p>
      )}
      <button type="button" onClick={reset} className="btn btn-primary mt-5">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
