import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSettings } from "@/lib/settings";
import PricingCards from "@/components/PricingCards";
import Faq from "@/components/Faq";
import PublicAd from "@/components/PublicAd";

export default async function PricingPage() {
  const t = getDictionary(getLang());
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="text-center">
        <h1 className="section-title">{t.pricing_title}</h1>
        <p className="section-sub">{t.pricing_sub}</p>
      </div>
      <div className="mt-12">
        <PricingCards t={t} settings={settings} />
      </div>
      <PublicAd placement="pricing" />
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="section-title text-center text-2xl">{t.faq_title}</h2>
        <div className="mt-8">
          <Faq t={t} />
        </div>
      </div>
    </div>
  );
}
