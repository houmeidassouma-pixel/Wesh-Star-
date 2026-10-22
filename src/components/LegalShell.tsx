import Link from "next/link";

// Shared layout for legal pages. TEXTS ARE TEMPLATES with [PLACEHOLDERS] —
// they are not legal advice. Replace placeholders and have a lawyer review
// before going live (Impressumspflicht, DSGVO, Fernabsatzrecht).
export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-zinc-500">Stand: {updated} · Vorlage ohne Rechtsberatung — Platzhalter [in Klammern] vor Veröffentlichung ersetzen.</p>
      <div className="prose-invert mt-8 space-y-6 text-sm leading-relaxed text-zinc-300 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-100 [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5 [&_p]:py-1 [&_strong]:text-zinc-100">
        {children}
      </div>
      <div className="mt-10 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        <Link href="/" className="text-banana hover:underline">← Zurück zur Startseite</Link>
      </div>
    </div>
  );
}
