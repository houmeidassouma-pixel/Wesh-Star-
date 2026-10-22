import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const lang = getLang() || settings.site.defaultLocale;
  const t = { ...getDictionary(lang), site_name: settings.site.name || "Wesh Star IA" };
  const access = await getAccess();

  return (
    <>
      <Header t={t} lang={lang} email={access.user?.email ?? null} role={access.role} />
      <main className="flex-1">{children}</main>
      <Footer t={t} name={settings.site.name} />
    </>
  );
}
