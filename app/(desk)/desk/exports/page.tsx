import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { requireDeskPage } from "@/lib/auth/session";
import { listExports } from "@/lib/exports/service";
import { formatDateIst } from "@/lib/utils";

export const metadata: Metadata = { title: "Tally exports" };
export const dynamic = "force-dynamic";

export default async function DeskExportsPage() {
  await requireDeskPage();
  const records = await listExports(50);
  const totalOrders = records.reduce(
    (sum, record) => sum + record.orderCount,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/desk"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
        </Link>
        <p className="text-[0.625rem] text-ink-muted">
          One file per export · duplicates blocked
        </p>
      </div>

      <header>
        <p className="eyebrow">Tally desk</p>
        <h1 className="display mt-2 text-[2rem] leading-[1.02] sm:text-[2.6rem]">
          Export log
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Every confirmed order leaves the app once, as a Tally Prime XML file
          or a CSV fallback. The checksum, creator, and order numbers are stored
          so a second export of the same order is refused.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Exports
          </p>
          <p className="money font-display mt-1.5 text-2xl font-medium leading-none">
            {records.length}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Orders sent
          </p>
          <p className="money font-display mt-1.5 text-2xl font-medium leading-none">
            {totalOrders}
          </p>
        </div>
        <div className="card col-span-2 p-3 sm:col-span-1">
          <p className="flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-ink-muted">
            <ShieldCheck className="h-3 w-3" strokeWidth={1.7} /> Integrity
          </p>
          <p className="mt-1.5 text-xs font-medium text-green-dark">
            SHA-256 checksums stored
          </p>
        </div>
      </section>

      {records.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-paper-deep text-ink-muted">
            <FileText className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <h2 className="display mt-5 text-[1.6rem] leading-tight">
            No exports yet.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Open a confirmed order and create a Tally file. The export appears
            here with its download link and checksum.
          </p>
          <Link href="/desk?status=confirmed" className="btn btn-primary mt-5">
            View confirmed orders
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((record) => (
            <article key={record.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                      record.format === "tally_xml"
                        ? "bg-blue-soft text-blue"
                        : "bg-green-soft text-green-dark",
                    ].join(" ")}
                  >
                    {record.format === "tally_xml" ? (
                      <FileCode2 className="h-4 w-4" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-all text-xs font-medium text-ink">
                      {record.fileName}
                    </h2>
                    <p className="mt-0.5 text-[0.625rem] text-ink-muted">
                      {formatDateIst(record.createdAt)} ·{" "}
                      {record.actorName ?? "Unknown desk user"} ·{" "}
                      {record.orderCount} order
                      {record.orderCount === 1 ? "" : "s"} ·{" "}
                      {record.format === "tally_xml" ? "Tally XML" : "CSV"}
                    </p>
                    <p className="mt-1 text-[0.625rem] leading-relaxed text-ink-soft">
                      {record.orderNumbers}
                    </p>
                  </div>
                </div>
                <a
                  href={record.downloadUrl}
                  download
                  className="btn btn-secondary h-9 min-h-9 shrink-0 px-3 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/70 pt-2 text-[0.5625rem] text-ink-muted">
                <span className="font-mono">
                  SHA-256 {record.checksum.slice(0, 32)}…
                </span>
                <span>Duplicate export of these orders is blocked.</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="card border-blue/15 bg-blue-soft/50 p-4">
        <h2 className="text-xs font-medium text-blue">
          Tally import assumptions
        </h2>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[0.6875rem] leading-relaxed text-blue/85">
          <li>
            Format: Tally Prime XML import envelope; company “Sahaj
            Distributors”.
          </li>
          <li>
            Vouchers are Sales vouchers with the shop name as the party ledger.
          </li>
          <li>
            Free cases are included at zero rate with the scheme in the
            narration.
          </li>
          <li>
            The CSV fallback has one row per item for manual reconciliation.
          </li>
        </ul>
      </div>
    </div>
  );
}
