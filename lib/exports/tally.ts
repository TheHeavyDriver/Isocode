export interface ExportLine {
  skuCode: string;
  name: string;
  qtyCases: number;
  isFree: boolean;
  unitPricePaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  lineTotalPaisa: number;
  gstRateBp: number;
}

export interface ExportOrder {
  orderNo: string;
  orderDate: Date | string;
  partyName: string;
  notes?: string | null;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  lines: ExportLine[];
}

export type ExportFormat = "tally_xml" | "csv";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rupees(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

export function tallyDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function voucherXml(order: ExportOrder): string {
  const inventory = order.lines
    .map((line) => {
      const rate = line.isFree ? 0 : line.unitPricePaisa;
      const amount = line.isFree ? 0 : -line.taxablePaisa;
      return `          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${escapeXml(line.name)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <RATE>${rupees(rate)}/CASE</RATE>
            <AMOUNT>${rupees(amount)}</AMOUNT>
            <DISCOUNT>${rupees(line.discountPaisa)}</DISCOUNT>
            <ACTUALQTY>${line.qtyCases} CASE</ACTUALQTY>
            <BILLEDQTY>${line.qtyCases} CASE</BILLEDQTY>
            <STOCKITEMCODE>${escapeXml(line.skuCode)}</STOCKITEMCODE>
          </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("\n");

  const narration = [
    `Order ${order.orderNo}`,
    order.notes?.trim() ? order.notes.trim() : null,
    order.lines.some((line) => line.isFree)
      ? `Includes ${order.lines
          .filter((line) => line.isFree)
          .reduce((sum, line) => sum + line.qtyCases, 0)} free case(s).`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${tallyDate(order.orderDate)}</DATE>
            <NARRATION>${escapeXml(narration)}</NARRATION>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(order.orderNo)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(order.orderNo)}</REFERENCE>
            <PARTYLEDGERNAME>${escapeXml(order.partyName)}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(order.partyName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${rupees(order.totalPaisa)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${rupees(-order.taxablePaisa)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output GST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${rupees(-order.taxPaisa)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
${inventory}
          </VOUCHER>
        </TALLYMESSAGE>`;
}

/**
 * Builds one Tally Prime import envelope for a set of confirmed orders. The
 * exact client Tally version is an assumption documented in the README; the
 * CSV builder below covers import-format uncertainty.
 */
export function buildTallyXml(orders: ExportOrder[]): string {
  const vouchers = orders.map(voucherXml).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Sahaj Distributors</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
}

export function buildTallyCsv(orders: ExportOrder[]): string {
  const header =
    "order_no,order_date,party,item_code,item_name,qty_cases,free_cases,rate_inr,discount_inr,tax_inr,total_inr\n";
  const rows = orders.flatMap((order) =>
    order.lines.map((line) =>
      [
        order.orderNo,
        tallyDate(order.orderDate),
        csvCell(order.partyName),
        csvCell(line.skuCode),
        csvCell(line.name),
        line.qtyCases,
        line.isFree ? line.qtyCases : 0,
        (line.isFree ? 0 : line.unitPricePaisa / 100).toFixed(2),
        (line.discountPaisa / 100).toFixed(2),
        (line.taxPaisa / 100).toFixed(2),
        (line.lineTotalPaisa / 100).toFixed(2),
      ].join(","),
    ),
  );
  return `${header}${rows.join("\n")}\n`;
}

export function buildExport(
  format: ExportFormat,
  orders: ExportOrder[],
): string {
  return format === "tally_xml" ? buildTallyXml(orders) : buildTallyCsv(orders);
}

export function exportFileName(
  format: ExportFormat,
  orders: ExportOrder[],
  now = new Date(),
): string {
  const stamp = tallyDate(now);
  const suffix =
    orders.length === 1 ? orders[0]!.orderNo : `${orders.length}-orders`;
  return `sahaj-${suffix}-${stamp}.${format === "tally_xml" ? "xml" : "csv"}`;
}
