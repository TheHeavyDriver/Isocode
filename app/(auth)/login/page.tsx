import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.user.role));

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-green px-12 py-10 text-surface lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 47px, #fffdf7 47px 48px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-surface/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-36 h-72 w-72 rounded-full border border-surface/10"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <BrandMark className="bg-surface text-green" />
            <div>
              <p className="display text-lg font-semibold leading-none">
                Sahaj Order
              </p>
              <p className="mt-1 text-xs tracking-[0.1em] text-surface/60">
                सहज ऑर्डर
              </p>
            </div>
          </div>

          <div className="mt-16 max-w-lg xl:mt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface/55">
              For the distributor&apos;s shopkeepers
            </p>
            <h1 className="display mt-4 text-[2.9rem] leading-[1.06] tracking-tight xl:text-[3.4rem]">
              The order is ready
              <br />
              before the customer
              <br />
              leaves the counter.
            </h1>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-surface/70">
              Live stock, your own price, and the current scheme. Build the
              order in a minute and send it straight to the desk.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-14 max-w-md">
          <div className="rounded-2xl border border-surface/15 bg-green-dark/80 p-5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-surface/55">
              <span>Order 0042</span>
              <span className="rounded-full bg-surface/10 px-2 py-1 text-surface/75">
                AI captured
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-surface/80">
                  Glucose biscuit · 10 cases
                </span>
                <span className="money text-surface">₹7,776.00</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-surface/80">
                  Detergent 1 kg · 5 cases
                </span>
                <span className="money text-surface">₹9,603.00</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-surface/15 pt-3">
                <span className="font-medium text-surface/90">
                  1 free biscuit case
                </span>
                <span className="text-xs text-surface/55">Scheme applied</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-6 text-[0.6875rem] text-surface/45">
            <span>33 seeded SKUs</span>
            <span>Live stock</span>
            <span>One shared order record</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <LoginForm />
      </section>
    </main>
  );
}
