"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoggingOut}
      aria-label="Déconnexion"
      aria-busy={isLoggingOut}
      title={isLoggingOut ? "Déconnexion en cours…" : "Déconnexion"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoggingOut ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-red-400" />
      ) : (
        label
      )}
    </button>
  );
}
