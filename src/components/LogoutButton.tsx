"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function LogoutButton({
  label,
  title = "Logout",
  ariaLabel = "Logout"
}: {
  label: string;
  title?: string;
  ariaLabel?: string;
}) {
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
      onClick={logout}
      disabled={isLoggingOut}
      title={title}
      aria-label={ariaLabel}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoggingOut ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        label
      )}
    </button>
  );
}
