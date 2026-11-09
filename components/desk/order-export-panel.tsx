"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FileCode2,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { postJson } from "@/lib/client/api";
import { formatDateIst } from "@/lib/utils";

interface ExportRecord {
  id: string;
  fileName: string;
  format: "tally_xml" | "csv";
  orderCount: number;
  checksum: string;
  createdAt: string;
  downloadUrl: string;
}

export function OrderExportPanel({
  orderId,
  orderStatus,
  initialExport,
}: {
  orderId: string;
  orderStatus: string;
  initialExport: ExportRecord | null;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<"tally_xml" | "csv">("tally_xml");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportRecord | null>(initialExport);

  async function createExport() {
    setBusy(true);
    setError(null);
    try {
      const response = await postJson<{ export: ExportRecord }>(
        "/api/exports",
        { orderIds: [orderId], format },
      );
      setResult(response.export);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The export could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-2.5">
        <div className="rounded-lg border border-blue/20 bg-blue-soft p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-blue">
            <ShieldCheck className="h-3.5 w-3.5" /> Exported to Tally
          </p>
          <p className="mt-1 break-all text-[0.6875rem] leading-relaxed text-blue/80">
            {result.fileName} · {formatDateIst(result.createdAt)}
          </p>
          <p className="mt-1 font-mono text-[0.5625rem] text-blue/60">
            SHA-256 {result.checksum.slice(0, 24)}…
          </p>
        </div>
        <a
          href={result.downloadUrl}
          className="btn btn-secondary w-full"
          download
        >
          <Download className="h-4 w-4" /> Download{" "}
          {result.format === "csv" ? "CSV" : "Tally XML"}
        </a>
        <p className="text-center text-[0.625rem] leading-relaxed text-ink-muted">
          A second export of this order is blocked to prevent duplicate Tally
          vouchers.
        </p>
      </div>
    );
  }

  if (orderStatus === "exported") {
    return (
      <div className="rounded-lg border border-line bg-paper/60 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
        This order is marked exported. Open the{" "}
        <Link href="/desk/exports" className="font-medium text-green underline">
          export log
        </Link>{" "}
        to download the stored file.
      </div>
    );
  }

  if (orderStatus !== "confirmed") {
    return (
      <div className="rounded-lg border border-line bg-paper/60 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
        Confirm the order before creating a Tally voucher. Only confirmed orders
        can be exported.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-relaxed text-ink-soft">
        Create one Tally Prime import file for this order. The export is logged
        and cannot be repeated.
      </p>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Export format</legend>
        <label
          className={[
            "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium transition",
            format === "tally_xml"
              ? "border-ink bg-ink text-white"
              : "border-line-strong bg-surface text-ink-soft",
          ].join(" ")}
        >
          <input
            type="radio"
            name={`format-${orderId}`}
            value="tally_xml"
            checked={format === "tally_xml"}
            onChange={() => setFormat("tally_xml")}
            className="sr-only"
          />
          <FileCode2 className="h-3.5 w-3.5" /> Tally XML
        </label>
        <label
          className={[
            "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium transition",
            format === "csv"
              ? "border-ink bg-ink text-white"
              : "border-line-strong bg-surface text-ink-soft",
          ].join(" ")}
        >
          <input
            type="radio"
            name={`format-${orderId}`}
            value="csv"
            checked={format === "csv"}
            onChange={() => setFormat("csv")}
            className="sr-only"
          />
          <FileSpreadsheet className="h-3.5 w-3.5" /> CSV fallback
        </label>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red/20 bg-red-soft px-3 py-2 text-[0.6875rem] leading-relaxed text-red"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={createExport}
        disabled={busy}
        className="btn btn-primary w-full"
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {busy ? "Creating export…" : "Create Tally export"}
      </button>
      <p className="text-center text-[0.625rem] leading-relaxed text-ink-muted">
        Tally Prime XML is the primary format; CSV is the fallback. The company
        name is set to “Sahaj Distributors”.
      </p>
    </div>
  );
}
