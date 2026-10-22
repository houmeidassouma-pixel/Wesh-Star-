import { getAccess } from "@/lib/access";
import { visitorMaySeeNetworkAds } from "@/lib/ads";
import NetworkAdBlock from "./NetworkAdBlock";

// Server component: renders an ad block only when the admin toggle is ON, the
// network is fully configured and this visitor is eligible. Otherwise renders
// nothing, so pages are unchanged while ads are OFF.
export default async function PublicAd({ placement = "page" }: { placement?: string }) {
  const access = await getAccess();
  if (!visitorMaySeeNetworkAds(access)) return null;
  const ads = access.settings.site.ads;
  return (
    <NetworkAdBlock
      network={ads.network === "custom" ? "custom" : "adsense"}
      publisherId={ads.publisherId}
      slotId={ads.adsenseSlotId}
      customCode={ads.customCode}
      customHeight={ads.customHeight}
      label={ads.label}
      placement={placement}
    />
  );
}
