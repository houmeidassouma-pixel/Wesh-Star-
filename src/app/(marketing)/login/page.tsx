import LoginForm from "@/components/LoginForm";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default function LoginPage() {
  const t = getDictionary(getLang());

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-12 lg:flex">
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-banana/10 blur-3xl" />
        <div className="animate-fade-up">
          <div className="text-5xl">🍌</div>
          <h2 className="mt-6 text-3xl font-extrabold">{t.hero_title_pre} <span className="grad-text">{t.hero_title_grad}</span></h2>
          <ul className="mt-8 space-y-3 text-sm text-zinc-400">
            <li className="flex items-center gap-2"><span className="text-banana">✓</span> {t.f2_d}</li>
            <li className="flex items-center gap-2"><span className="text-banana">✓</span> {t.f3_d}</li>
            <li className="flex items-center gap-2"><span className="text-banana">✓</span> {t.f4_d}</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <LoginForm t={t} />
        </div>
      </div>
    </div>
  );
}
