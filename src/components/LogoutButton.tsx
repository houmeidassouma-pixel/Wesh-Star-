"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

interface LogoutButtonProps {
  label?: string;
  title?: string;
}

export default function LogoutButton({
  label = "⏻",
  title = "Déconnexion"
}: LogoutButtonProps) {
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

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title={title}
      aria-label={title}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:opacity-50"
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-red-400" />
      ) : (
        label
      )}
    </button>
  );
}
