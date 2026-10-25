"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/account/client";

export default function LogoutButton({
  label,
  ariaLabel = "Déconnexion"
}: {
  label: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <button
      onClick={logout}
      title={ariaLabel}
      aria-label={ariaLabel}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
    >
      {label}
    </button>
  );
}
