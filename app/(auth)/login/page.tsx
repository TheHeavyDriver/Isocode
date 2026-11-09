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
    <main className="grid min-h-dvh lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          aria-hidden="true"
          className="blueprint pointer-events-none absolute inset-0 opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-24 h-[26rem] w-[26rem] rounded-full border border-green/25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 right-1/3 h-96 w-96 rotate-45 border border-white/[0.06]"
        />
        <span
          aria-hidden="true"
          className="display pointer-events-none absolute -bottom-24 right-2 select-none text-[22rem] leading-none text-white/[0.025]"
        >
          स
        </span>

        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="bg-white text-ink" />
          <div>
            <p className="display text-lg font-medium leading-none">
              Sahaj Order
            </p>
            <p className="mt-1.5 text-[0.625rem] uppercase tracking-[0.16em] text-white/40">
              सहज ऑर्डर
            </p>
          </div>
          <span className="ml-auto rounded-full border border-white/15 px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-white/45">
            B2B ordering
          </span>
        </div>

        <div className="relative z-10 mt-16 max-w-xl xl:mt-24">
          <p className="flex items-center gap-2 text-[0.625rem] font-medium uppercase tracking-[0.18em] text-white/45">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-green"
            />
            For the distributor&apos;s shopkeepers
          </p>
          <h1 className="display mt-5 text-[3rem] leading-[1.04] tracking-[-0.035em] xl:text-[3.8rem]">
            The order is ready{" "}
            <span className="text-[#7fd0b6]">
              before the customer leaves the counter.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-white/55">
            Live stock, your own price, and the current scheme. Build the order
            in a minute and send it straight to the desk.
          </p>
        </div>

        <div className="relative z-10 mt-14 max-w-md">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[0.625rem] font-medium uppercase tracking-[0.14em] text-white/40">
              <span>Order 0042</span>
              <span className="rounded-full border border-green/30 bg-green/10 px-2 py-1 text-[0.625rem] text-[#7fd0b6]">
                AI captured
              </span>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/65">
                  Glucose biscuit · 10 cases
                </span>
                <span className="money text-white">₹7,776.00</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-white/65">Detergent 1 kg · 5 cases</span>
                <span className="money text-white">₹9,603.00</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
                <span className="font-medium text-[#7fd0b6]">
                  1 free biscuit case
                </span>
                <span className="text-[0.625rem] uppercase tracking-[0.1em] text-white/35">
                  Scheme applied
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.625rem] uppercase tracking-[0.14em] text-white/30">
            <span>33 seeded SKUs</span>
            <span>Live stock</span>
            <span>One shared order record</span>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <div
          aria-hidden="true"
          className="blueprint-dark pointer-events-none absolute inset-0 opacity-50 lg:hidden"
        />
        <div className="relative w-full">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
