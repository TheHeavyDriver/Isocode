"use client";

import { RotateCcw } from "lucide-react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="eyebrow">Catalogue</p>
      <h1 className="display mt-2 text-2xl">The shop could not load.</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        This is usually a network or database hiccup. Your cart is safe on this
        phone.
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
