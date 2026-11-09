"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Languages, LoaderCircle } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { t, type Language } from "@/lib/i18n";

export function LanguageToggle({ initial }: { initial: Language }) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(initial);
  const [busy, setBusy] = useState<Language | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Language) {
    if (next === language || busy) return;
    setBusy(next);
    setError(null);
    setMessage(null);
    try {
      await postJson("/api/language", { language: next });
      setLanguage(next);
      setMessage(t(next, "saved"));
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the language. Try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {(["en", "hi"] as const).map((option) => {
          const active = language === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              disabled={busy !== null}
              aria-pressed={active}
              className={[
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line-strong bg-surface text-ink-soft hover:border-ink/30 hover:text-ink",
              ].join(" ")}
            >
              {busy === option ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : active ? (
                <Check className="h-4 w-4" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {option === "en" ? t("en", "english") : t("hi", "hindi")}
            </button>
          );
        })}
      </div>
      {message && (
        <p className="mt-2 text-[0.6875rem] font-medium text-green-dark">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[0.6875rem] text-red">
          {error}
        </p>
      )}
    </div>
  );
}
