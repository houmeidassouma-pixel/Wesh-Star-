import Link from "next/link";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default function NotFound() {
  const t = getDictionary(getLang());
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-20 text-center">
      <div className="animate-fade-up">
        <div className="text-6xl">🍌</div>
        <h1 className="mt-4 text-4xl font-extrabold">404</h1>
        <p className="mt-2 text-zinc-400">{t.notfound_text}</p>
        <Link href="/" className="btn-primary btn-md mt-6 inline-flex">← {t.notfound_back}</Link>
      </div>
    </div>
  );
}
