import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/settings";
import { getAccess } from "@/lib/access";
import PricingCards from "@/components/PricingCards";
import Faq from "@/components/Faq";
import PublicAd from "@/components/PublicAd";

export default async function Home() {
  const t = getDictionary(getLang());
  const settings = await getSettings();
  const access = await getAccess();
  if (access.user) {
    if (settings.site.socialNetworkEnabled) redirect("/community");
    redirect("/generate");
  }
  const cta = "/login";

  const steps = [
    { icon: "✍️", title: t.step1_t, desc: t.step1_d },
    { icon: "🎬", title: t.step2_t, desc: t.step2_d },
    { icon: "⬇️", title: t.step3_t, desc: t.step3_d }
  ];
  const features = [
    { icon: "🪄", title: t.f1_t, desc: t.f1_d },
    { icon: "📱", title: t.f2_t, desc: t.f2_d },
    { icon: "🧩", title: t.f3_t, desc: t.f3_d },
    { icon: "📈", title: t.f4_t, desc: t.f4_d },
    { icon: "🛡️", title: t.f5_t, desc: t.f5_d },
    { icon: "🌍", title: t.f6_t, desc: t.f6_d }
  ];

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-banana/15 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
          <div className="animate-fade-up">
            <span className="badge-yellow">✨ {t.hero_badge}</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {t.hero_title_pre} <span className="grad-text">{t.hero_title_grad}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-zinc-400">{t.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={cta} className="btn-primary btn-lg">{t.hero_primary} →</Link>
              <Link href="/pricing" className="btn-secondary btn-lg">{t.hero_secondary}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="badge-zinc">🆓 {t.plan_free} · 2 × 10 s</span>
              <span className="badge-zinc">⚡ {t.up_to} 2 {t.min_unit}</span>
              <span className="badge-zinc">🌍 16 {t.language}</span>
            </div>
          </div>

          {/* Product mock */}
          <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="card relative overflow-hidden p-1">
              <div className="absolute inset-0 bg-gradient-to-br from-banana/20 via-transparent to-transparent" />
              <div className="relative rounded-xl bg-zinc-950/80 p-5">
                <div className="label">{t.prompt}</div>
                <div className="input min-h-[5rem] text-zinc-300">{t.mock_prompt}</div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-banana" />
                  <span className="text-xs font-medium text-banana">{t.mock_rendering}</span>
                  <span className="ml-auto text-xs text-zinc-500">72%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="progress-shimmer h-full w-[72%] rounded-full bg-banana" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["🌊", "🐶", "🌅"].map((e, i) => (
                    <div key={i} className="grid aspect-video place-items-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-2xl">{e}</div>
                  ))}
                </div>
                <div className="btn-primary btn-md mt-4 w-full">⬇ {t.download}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="section-title text-center">{t.how_title}</h2>
          <p className="section-sub text-center">{t.how_sub}</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="card-hover animate-fade-up p-6" style={{ animationDelay: i * 0.1 + "s" }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-banana/10 text-xl">{s.icon}</span>
                  <span className="text-sm font-bold text-zinc-600">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="section-title text-center">{t.features_title}</h2>
          <p className="section-sub text-center">{t.features_sub}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={i} className="card-hover animate-fade-up p-6" style={{ animationDelay: (i % 3) * 0.08 + "s" }}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-banana/10 text-xl">{f.icon}</span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Ad block (only when ads are ON in Admin) ---------- */}
      <PublicAd placement="home" />

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="border-t border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="section-title text-center">{t.pricing_title}</h2>
          <p className="section-sub text-center">{t.pricing_sub}</p>
          <div className="mt-12">
            <PricingCards t={t} settings={settings} />
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-4 py-20 md:px-6">
          <h2 className="section-title text-center">{t.faq_title}</h2>
          <p className="section-sub text-center">{t.faq_sub}</p>
          <div className="mt-10">
            <Faq t={t} />
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
          <h2 className="section-title">{t.cta_final_title}</h2>
          <p className="section-sub">{t.cta_final_sub}</p>
          <Link href={cta} className="btn-primary btn-lg mt-8">{t.hero_primary} →</Link>
        </div>
      </section>
    </div>
  );
}
