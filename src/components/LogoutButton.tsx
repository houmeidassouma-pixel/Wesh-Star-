"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

import { useState } from "react";

export default function LogoutButton({
  label,
  ariaLabel = "Déconnexion"
}: {
  label: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={logout}
      disabled={busy}
      title={ariaLabel}
      aria-label={ariaLabel}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:pointer-events-none disabled:opacity-50"
    >
      {busy ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
      ) : (
        label
      )}
    </button>
  );
}
