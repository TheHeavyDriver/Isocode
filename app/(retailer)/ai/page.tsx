import type { Metadata } from "next";
import { requireRetailerPage } from "@/lib/auth/session";
import { getCatalogue } from "@/lib/catalogue/service";
import { listRetailerCaptures } from "@/lib/ai/service";
import { AiCaptureReview } from "@/components/retailer/ai-capture-review";

export const metadata: Metadata = { title: "AI order" };
export const dynamic = "force-dynamic";

export default async function AiOrderPage() {
  const session = await requireRetailerPage();
  const [catalogue, captures] = await Promise.all([
    getCatalogue(session.retailer.id),
    listRetailerCaptures(session.retailer.id, 8),
  ]);

  return (
    <AiCaptureReview
      products={catalogue.products}
      captures={captures}
      language={session.retailer.language}
    />
  );
}
