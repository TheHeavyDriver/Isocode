import type { Metadata } from "next";
import { requireRetailerPage } from "@/lib/auth/session";
import { CartView } from "@/components/retailer/cart-view";

export const metadata: Metadata = { title: "Cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await requireRetailerPage();

  return (
    <CartView
      retailer={{
        shopName: session.retailer.shopName,
        ownerName: session.retailer.ownerName,
        creditLimitPaisa: session.retailer.creditLimitPaisa,
        outstandingPaisa: session.retailer.outstandingPaisa,
        language: session.retailer.language,
      }}
    />
  );
}
