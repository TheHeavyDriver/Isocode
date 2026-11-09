import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="card relative w-full max-w-md overflow-hidden p-8 text-center">
        <div
          aria-hidden="true"
          className="blueprint-dark pointer-events-none absolute inset-0 opacity-50"
        />
        <div className="relative">
          <Logo className="justify-center" />
          <p className="eyebrow mt-8">404</p>
          <h1 className="display mt-2 text-[2rem] leading-tight">
            This page is not in the ledger.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The link may be old, or the order may have moved. Go back to the
            catalogue and carry on.
          </p>
          <Link href="/shop" className="btn btn-primary mt-6 w-full">
            Back to the shop
          </Link>
        </div>
      </div>
    </main>
  );
}
