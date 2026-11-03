"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { postJson } from "@/lib/client/api";

export function LogoutButton({
  className = "btn btn-secondary",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      await postJson("/api/auth/logout", {});
      router.push("/login");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not sign out. Try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className={className}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {pending ? "Signing out…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[0.6875rem] text-red">
          {error}
        </p>
      )}
    </div>
  );
}
