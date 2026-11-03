import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Languages,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import { requireRetailerPage } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { formatInr } from "@/lib/pricing/money";
import { initials } from "@/lib/utils";
import { CreditStrip } from "@/components/retailer/credit-strip";
import { LanguageToggle } from "@/components/retailer/language-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireRetailerPage();
  const { retailer } = session;
  const language = retailer.language;

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">{t(language, "account")}</p>
        <h1 className="display mt-1 text-[1.75rem] leading-none sm:text-3xl">
          {t(language, "yourAccount")}
        </h1>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-ink-soft">
          {t(language, "accountIntro")}
        </p>
      </header>

      <section className="card flex items-center gap-3 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green text-sm font-bold text-surface">
          {initials(retailer.shopName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight">
            {retailer.shopName}
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <UserRound className="h-3 w-3" /> {retailer.ownerName}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-ink-muted">
            <Phone className="h-3 w-3" /> {retailer.phone}
          </p>
        </div>
        <span className="pill bg-green-soft text-green-dark">
          {t(language, "retailer")}
        </span>
      </section>

      <CreditStrip
        limitPaisa={retailer.creditLimitPaisa}
        outstandingPaisa={retailer.outstandingPaisa}
      />

      <section className="card p-4">
        <h2 className="display flex items-center gap-2 text-lg">
          <Store className="h-4 w-4 text-green" />
          {t(language, "profile")}
        </h2>
        <dl className="mt-3 space-y-2.5 text-xs">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">Shop</dt>
            <dd className="text-right font-semibold text-ink">
              {retailer.shopName}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">{t(language, "shopkeeper")}</dt>
            <dd className="text-right font-semibold text-ink">
              {retailer.ownerName}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-right font-semibold text-ink">
              {retailer.phone}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-ink-muted">Address</dt>
            <dd className="flex items-start gap-1 text-right leading-relaxed text-ink-soft">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              {retailer.address}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-line pt-2.5">
            <dt className="text-ink-muted">Credit limit</dt>
            <dd className="money text-right font-semibold text-ink">
              {formatInr(retailer.creditLimitPaisa)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">Outstanding</dt>
            <dd className="money text-right font-semibold text-amber">
              {formatInr(retailer.outstandingPaisa)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 rounded-lg bg-paper/70 px-3 py-2 text-[0.625rem] leading-relaxed text-ink-muted">
          Credit is set by the distributor. Ask the desk if the limit or
          outstanding balance looks wrong.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="display flex items-center gap-2 text-lg">
          <Languages className="h-4 w-4 text-green" />
          {t(language, "language")}
        </h2>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-ink-muted">
          {t(language, "languageHelp")}
        </p>
        <div className="mt-3">
          <LanguageToggle initial={language} />
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/shop"
          className="card flex items-center gap-2 p-3 text-xs font-semibold transition hover:border-line-strong"
        >
          <Store className="h-4 w-4 text-green" /> {t(language, "browseShop")}
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-muted" />
        </Link>
        <Link
          href="/ai"
          className="card flex items-center gap-2 p-3 text-xs font-semibold transition hover:border-line-strong"
        >
          <Sparkles className="h-4 w-4 text-green" />{" "}
          {t(language, "pasteOrder")}
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-muted" />
        </Link>
        <Link
          href="/orders"
          className="card flex items-center gap-2 p-3 text-xs font-semibold transition hover:border-line-strong"
        >
          <ClipboardList className="h-4 w-4 text-green" />{" "}
          {t(language, "orderHistory")}
          <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-muted" />
        </Link>
      </section>

      <section className="card p-4">
        <h2 className="display flex items-center gap-2 text-lg">
          <ShieldCheck className="h-4 w-4 text-green" /> Sign in and security
        </h2>
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-ink-muted">
          You sign in with a one-time code on {retailer.phone}. Sessions expire
          automatically, and signing out revokes this session on the server.
        </p>
        <div className="mt-3">
          <LogoutButton
            label={t(language, "signOut")}
            className="btn btn-secondary w-full"
          />
        </div>
      </section>

      <p className="pb-2 text-center text-[0.625rem] text-ink-muted">
        Sahaj Order · demo shop · all names and numbers are fictional
      </p>
    </div>
  );
}
