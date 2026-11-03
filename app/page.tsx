import { redirect } from "next/navigation";
import { getSession, homeForRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? homeForRole(session.user.role) : "/login");
}
