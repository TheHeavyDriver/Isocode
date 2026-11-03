import { describe, expect, it } from "vitest";
import {
  buildExport,
  buildTallyCsv,
  buildTallyXml,
  escapeXml,
  exportFileName,
  rupees,
  tallyDate,
  type ExportOrder,
} from "@/lib/exports/tally";

const order: ExportOrder = {
  orderNo: "SO-20261102-0042",
  orderDate: new Date("2026-11-02T08:15:00.000Z"),
  partyName: "Sharma & Sons, Main Market",
  notes: "Call before delivery",
  subtotalPaisa: 2_697_900,
  discountPaisa: 12_000,
  taxablePaisa: 2_624_400,
  taxPaisa: 73_500,
  totalPaisa: 2_697_900,
  lines: [
    {
      skuCode: "SKU-BS-075",
      name: "Glucose biscuit 75 g",
      qtyCases: 10,
      isFree: false,
      unitPricePaisa: 77_760,
      discountPaisa: 12_000,
      taxablePaisa: 2_624_400,
      taxPaisa: 73_500,
      lineTotalPaisa: 2_697_900,
      gstRateBp: 1800,
    },
    {
      skuCode: "SKU-BS-075",
      name: "Glucose biscuit 75 g",
      qtyCases: 1,
      isFree: true,
      unitPricePaisa: 77_760,
      discountPaisa: 0,
      taxablePaisa: 0,
      taxPaisa: 0,
      lineTotalPaisa: 0,
      gstRateBp: 1800,
    },
  ],
};

describe("tallyDate", () => {
  it("formats the voucher date in IST, not UTC", () => {
    expect(tallyDate(new Date("2026-11-02T20:00:00.000Z"))).toBe("20261103");
    expect(tallyDate("2026-11-02T08:15:00.000Z")).toBe("20261102");
  });
});

describe("rupees", () => {
  it("converts integer paisa to a two-decimal Tally amount", () => {
    expect(rupees(2_697_900)).toBe("26979.00");
    expect(rupees(0)).toBe("0.00");
    expect(rupees(1)).toBe("0.01");
  });
});

describe("escapeXml", () => {
  it("escapes every XML-sensitive character", () => {
    expect(escapeXml(`A&B <C> "D" 'E'`)).toBe(
      "A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;",
    );
  });
});

describe("buildTallyXml", () => {
  const xml = buildTallyXml([order]);

  it("wraps vouchers in one Tally Prime import envelope", () => {
    expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
    expect(xml).toContain(
      "<SVCURRENTCOMPANY>Sahaj Distributors</SVCURRENTCOMPANY>",
    );
    expect(xml.match(/<VOUCHER /g)).toHaveLength(1);
  });

  it("writes the party, order number, and balanced ledger entries", () => {
    expect(xml).toContain(
      "<PARTYLEDGERNAME>Sharma &amp; Sons, Main Market</PARTYLEDGERNAME>",
    );
    expect(xml).toContain("<VOUCHERNUMBER>SO-20261102-0042</VOUCHERNUMBER>");
    expect(xml).toContain("<AMOUNT>26979.00</AMOUNT>");
    expect(xml).toContain("<AMOUNT>-26244.00</AMOUNT>");
    expect(xml).toContain("<AMOUNT>-735.00</AMOUNT>");
  });

  it("writes a zero-rate free line and explains it in the narration", () => {
    expect(xml).toContain("<ACTUALQTY>1 CASE</ACTUALQTY>");
    expect(xml).toContain("<RATE>0.00/CASE</RATE>");
    expect(xml).toContain("Includes 1 free case(s).");
    expect(xml).toContain("Call before delivery");
  });

  it("does not emit raw XML-sensitive party text", () => {
    expect(xml).not.toContain("Sharma & Sons");
  });
});

describe("buildTallyCsv", () => {
  const csv = buildTallyCsv([order]);

  it("writes a header and one row per item", () => {
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "order_no,order_date,party,item_code,item_name,qty_cases,free_cases,rate_inr,discount_inr,tax_inr,total_inr",
    );
    expect(lines[1]).toContain("SO-20261102-0042,20261102,");
    expect(lines[1]).toContain(",10,0,777.60,120.00,735.00,26979.00");
    expect(lines[2]).toContain(",1,1,0.00,0.00,0.00,0.00");
  });

  it("quotes a party name containing commas and quotes", () => {
    expect(csv).toContain('"Sharma & Sons, Main Market"');
  });
});

describe("buildExport and exportFileName", () => {
  it("dispatches to XML or CSV", () => {
    expect(buildExport("tally_xml", [order])).toContain("<?xml");
    expect(buildExport("csv", [order])).toContain("order_no,order_date");
  });

  it("builds a stable, descriptive file name", () => {
    expect(
      exportFileName("tally_xml", [order], new Date("2026-11-02T08:15:00Z")),
    ).toBe("sahaj-SO-20261102-0042-20261102.xml");
    expect(
      exportFileName("csv", [order, order], new Date("2026-11-02T08:15:00Z")),
    ).toBe("sahaj-2-orders-20261102.csv");
  });
});
