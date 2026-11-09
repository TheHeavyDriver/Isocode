"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ClientApiError, postJson } from "@/lib/client/api";
import { maskPhone, normalizePhone } from "@/lib/auth/phone";
import { BrandMark } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";

interface OtpResponse {
  expiresInSeconds: number;
  resendAfterSeconds: number;
  demoOtpEnabled: boolean;
}

interface VerifyResponse {
  user: { id: string; name: string; role: string };
  redirectTo: string;
}

const demoAccounts = [
  {
    label: "Rajesh Kirana",
    detail: "Retailer · Jabalpur",
    phone: "+919000000001",
  },
  {
    label: "Shree Ganesh Store",
    detail: "Retailer · near credit limit",
    phone: "+919000000002",
  },
  {
    label: "Order desk",
    detail: "Suresh Tiwari",
    phone: "+919000000101",
  },
];

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [demoOtpEnabled, setDemoOtpEnabled] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") {
      codeRef.current?.focus();
    }
  }, [step]);

  const normalized = normalizePhone(phone);

  async function requestCode() {
    setError(null);
    setNotice(null);

    if (!normalized) {
      setError("Enter a valid 10-digit mobile number.");
      phoneRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const data = await postJson<OtpResponse>("/api/auth/otp", {
        phone,
      });
      setDemoOtpEnabled(data.demoOtpEnabled);
      setResendIn(data.resendAfterSeconds);
      setStep("otp");
      setCode("");
      setNotice(
        `If this number is registered, a 6-digit code is on its way. It expires in ${Math.round(data.expiresInSeconds / 60)} minutes.`,
      );
    } catch (caught) {
      setError(
        caught instanceof ClientApiError
          ? caught.message
          : "Could not send the code. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError(null);

    if (!normalized) {
      setStep("phone");
      setError("Enter your mobile number again.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      codeRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const data = await postJson<VerifyResponse>("/api/auth/verify", {
        phone,
        code,
      });
      router.replace(data.redirectTo);
      router.refresh();
    } catch (caught) {
      setBusy(false);
      setError(
        caught instanceof ClientApiError
          ? caught.message
          : "Could not sign you in. Check your connection and try again.",
      );
      codeRef.current?.focus();
    }
  }

  function pickDemo(demoPhone: string) {
    setPhone(demoPhone);
    setError(null);
    setNotice(null);
    setStep("phone");
    phoneRef.current?.focus();
  }

  return (
    <div className="animate-rise w-full max-w-[27rem]">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <BrandMark />
        <div>
          <p className="display text-lg font-medium leading-none">
            Sahaj Order
          </p>
          <p className="mt-1.5 text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
            Order capture
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-7">
          <p className="eyebrow">Retailer &amp; order desk</p>
          <span className="flex items-center gap-1.5 text-[0.5625rem] font-medium uppercase tracking-[0.12em] text-ink-muted">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-green"
            />
            OTP access
          </span>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-8">
          {step === "phone" ? (
            <>
              <h1 className="display text-[1.9rem] leading-[1.06] sm:text-[2.25rem]">
                Sign in
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                Enter your registered mobile number. We&apos;ll send a code.
              </p>

              <div className="mt-6 rounded-lg border border-line bg-paper/70 p-2.5">
                <p className="px-1 pb-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-muted">
                  Demo accounts
                </p>
                <div className="grid gap-0.5">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.phone}
                      type="button"
                      onClick={() => pickDemo(account.phone)}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2.5 text-left transition hover:bg-surface focus-visible:bg-surface"
                    >
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {account.label}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {account.detail}
                        </span>
                      </span>
                      <span className="font-mono text-[0.6875rem] text-ink-muted">
                        {account.phone.replace("+91", "")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void requestCode();
                }}
              >
                <label className="label" htmlFor="phone">
                  Mobile number
                </label>
                <div className="flex items-stretch">
                  <span className="flex min-h-11 items-center rounded-l-lg border border-r-0 border-line-strong bg-paper px-3 text-sm font-medium text-ink-soft">
                    +91
                  </span>
                  <input
                    ref={phoneRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    autoFocus
                    value={phone.replace(/^\+91/, "")}
                    onChange={(event) =>
                      setPhone(
                        event.target.value.replace(/[^\d]/g, "").slice(0, 10),
                      )
                    }
                    placeholder="90000 00001"
                    className="field rounded-l-none tracking-[0.04em]"
                    aria-describedby="phone-help"
                    aria-invalid={Boolean(error)}
                  />
                </div>
                <p id="phone-help" className="mt-2 text-xs text-ink-muted">
                  We&apos;ll send a one-time code.
                </p>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-md border border-red/20 bg-red-soft px-3 py-2 text-sm text-red"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !normalized}
                  className="btn btn-primary mt-5 w-full"
                >
                  {busy ? (
                    <>
                      <Spinner /> Sending code…
                    </>
                  ) : (
                    <>
                      Send code <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setNotice(null);
                }}
                className="mb-5 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-ink-muted transition hover:text-ink"
              >
                ← Change number
              </button>

              <h1 className="display text-[1.9rem] leading-[1.06] sm:text-[2.25rem]">
                Enter code
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                Code sent to{" "}
                <span className="font-medium text-ink">
                  {normalized ? maskPhone(normalized) : "your number"}
                </span>
                . Valid for 5 minutes.
              </p>

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyCode();
                }}
              >
                <label className="label" htmlFor="code">
                  6-digit code
                </label>
                <input
                  ref={codeRef}
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className="field h-16 text-center font-mono text-2xl tracking-[0.45em]"
                  aria-describedby="code-help"
                  aria-invalid={Boolean(error)}
                />

                {demoOtpEnabled && (
                  <p
                    id="code-help"
                    className="mt-2.5 rounded-md border border-green/15 bg-green-soft px-3 py-2 text-xs font-medium text-green-dark"
                  >
                    Demo build: the code for seeded numbers is{" "}
                    <span className="font-mono font-semibold">123456</span>.
                  </p>
                )}

                {notice && !error && (
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                    {notice}
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-md border border-red/20 bg-red-soft px-3 py-2 text-sm text-red"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="btn btn-primary mt-5 w-full"
                >
                  {busy ? (
                    <>
                      <Spinner /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line bg-paper/60 px-3 py-1.5 text-xs">
                  <span className="text-ink-muted">
                    {resendIn > 0
                      ? `Resend in 0:${String(resendIn).padStart(2, "0")}`
                      : "Did not get the code?"}
                  </span>
                  <button
                    type="button"
                    disabled={resendIn > 0 || busy}
                    onClick={() => void requestCode()}
                    className="min-h-9 font-medium text-green transition hover:text-green-dark disabled:text-ink-muted"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="flex items-start gap-2 border-t border-line bg-paper/45 px-5 py-3.5 text-[0.6875rem] leading-relaxed text-ink-muted sm:px-7">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" />
          <p>
            Your data is scoped to your shop and visible only to the order desk.
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-[0.6875rem] leading-relaxed text-ink-muted">
        Demo data is fictional. Do not enter real shop or personal details.
      </p>
    </div>
  );
}
