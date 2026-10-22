import { getAccess } from "@/lib/access";
import { networkAdsConfigured, visitorMaySeeNetworkAds } from "@/lib/ads";
import NetworkAdBlock from "./NetworkAdBlock";
import AdUnit from "./AdUnit";

// Non-intrusive ad rail used throughout the authenticated app.
// Network ads (AdSense/custom) take priority; the existing first-party campaign
// system is used as a fallback. The rail never blocks the main workspace.
export default async function AppAdRail() {
  const access = await getAccess();
  const ads = access.settings.site.ads;
  if (!ads.enabled) return null;

  if (networkAdsConfigured(ads)) {
    if (!visitorMaySeeNetworkAds(access)) return null;
    return (
      <NetworkAdBlock
        network={ads.network === "custom" ? "custom" : "adsense"}
        publisherId={ads.publisherId}
        slotId={ads.adsenseSlotId}
        customCode={ads.customCode}
        customHeight={ads.customHeight}
        label={ads.label}
        placement="app-sidebar"
      />
    );
  }

  return <AdUnit context="Wesh Star IA app sidebar" />;
}
