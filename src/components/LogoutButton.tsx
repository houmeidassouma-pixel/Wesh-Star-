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

  const ariaLabel = label === "⏻" ? "Se déconnecter" : (label || "Se déconnecter");

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoggingOut}
      title="Se déconnecter"
      aria-label={ariaLabel}
      aria-busy={isLoggingOut}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={isLoggingOut ? "animate-pulse" : ""}>{label}</span>
    </button>
  );
}
