"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function LogoutButton({ label, ariaLabel }: { label: string; ariaLabel?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  const computedAriaLabel = ariaLabel || (label !== "⏻" ? label : "Logout");

  return (
    <button
      onClick={logout}
      disabled={loading}
      aria-busy={loading}
      aria-label={computedAriaLabel}
      title={computedAriaLabel}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
      ) : (
        label
      )}
    </button>
  );
}
