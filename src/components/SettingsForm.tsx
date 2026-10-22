"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DURATION_OPTIONS = [60,120,300,600,1800,3600,7200,10800,14400,18000,21600];
const PLATFORM_MAX: Record<string, number> = { tiktok:600, facebook:14400, youtube:21600, snapchat:600, instagram:900, twitch:21600, x:140, linkedin:3600 };
const durationLabel = (s:number) => s < 3600 ? `${Math.round(s/60)} min` : `${Math.round(s/3600)} h`;

const LOCALES = [
  ["de","Deutsch"],["en","English"],["fr","Français"],["es","Español"],["it","Italiano"],["pt","Português"],
  ["nl","Nederlands"],["pl","Polski"],["tr","Türkçe"],["ar","العربية"],["hi","हिन्दी"],["zh","中文"],["ja","日本語"],
  ["ko","한국어"],["ru","Русский"],["uk","Українська"],["fa","فارسی"],["id","Bahasa Indonesia"],["ms","Bahasa Melayu"],
  ["th","ไทย"],["vi","Tiếng Việt"],["sv","Svenska"],["da","Dansk"],["nb","Norsk"],["fi","Suomi"],["el","Ελληνικά"],
  ["he","עברית"],["cs","Čeština"],["hu","Magyar"],["ro","Română"],["bg","Български"],["sr","Српски"],["sw","Kiswahili"],
  ["ur","اردو"],["bn","বাংলা"],["fil","Filipino"]
] as const;

const EMOTIONS = ["neutre","romantique","drôle","triste","colère","peur","dramatique"];
const WEEKDAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

export default function SettingsForm({ settings, t }: { settings: any; t: Record<string, string> }) {
  const site = settings.site || {};
  const platforms = site.platforms || {};
  const video = settings.video || {};
  const [name, setName] = useState(site.name || "Wesh Star IA");
  const [tagline, setTagline] = useState(site.tagline || "Créez, partagez et promouvez vos vidéos.");
  const [accentColor, setAccentColor] = useState(site.accentColor || "#facc15");
  const [logoUrl, setLogoUrl] = useState(site.logoUrl || "");
  const [logoEmoji, setLogoEmoji] = useState(site.logoEmoji || "⭐");
  const [themePreset, setThemePreset] = useState(site.themePreset || "midnight");
  const [pricePer1000Views, setPricePer1000Views] = useState(Number(site.promotionPricing?.pricePer1000Views ?? 10));
  const [minPromoViews, setMinPromoViews] = useState(Number(site.promotionPricing?.minViews ?? 100));
  const [maxPromoViews, setMaxPromoViews] = useState(Number(site.promotionPricing?.maxViews ?? 100000));
  const [creatorShare, setCreatorShare] = useState(Math.max(0, Math.min(100, Number(site.longVideoCreatorSharePercent ?? 60))));
  const [longVideoAdBreaks, setLongVideoAdBreaks] = useState(site.longVideoAdBreaksEnabled === true);
  const [adInterval, setAdInterval] = useState(Math.max(3, Math.min(60, Number(site.longVideoAdIntervalMinutes ?? 8))));
  const [maintenance, setMaintenance] = useState(!!site.maintenance);
  const [locale, setLocale] = useState(site.defaultLocale || "de");
  const [communityEnabled, setCommunityEnabled] = useState(!!site.communityEnabled);
  const [socialNetworkEnabled, setSocialNetworkEnabled] = useState(!!site.socialNetworkEnabled);
  const [autoPublishToCommunity, setAutoPublishToCommunity] = useState(site.autoPublishToCommunity === true);
  const [autopilotCrossPostAllPlatforms, setAutopilotCrossPostAllPlatforms] = useState(site.autopilotCrossPostAllPlatforms === true);
  const [allowUserAccounts, setAllowUserAccounts] = useState(site.allowUserAccounts !== false);
  const [allowModeratorAccounts, setAllowModeratorAccounts] = useState(site.allowModeratorAccounts !== false);
  const [clipSeconds, setClipSeconds] = useState(video.clipSeconds || 10);
  const [f, setF] = useState({
    costPerClipEur: video.costPerClipEur ?? 0.5,
    maxScenesPerJob: video.maxScenesPerJob ?? 800,
    sceneTimeoutMinutes: video.sceneTimeoutMinutes ?? 30,
    maxAttempts: video.maxAttempts ?? 5,
    maxSceneAttempts: video.maxSceneAttempts ?? 3,
    maxDailyGenerations: site.maxDailyGenerations ?? 2000,
    maxConcurrentJobsPerUser: site.maxConcurrentJobsPerUser ?? 3,
    adminDailyJobs: site.adminDailyJobs ?? 100
  });
  const [pl, setPl] = useState({
    tiktok: platforms.tiktok !== false, facebook: !!platforms.facebook,
    youtube: !!platforms.youtube, snapchat: !!platforms.snapchat, instagram: !!platforms.instagram, twitch: !!platforms.twitch, x: !!platforms.x, linkedin: !!platforms.linkedin
  });
  const [autopilotEnabled, setAutopilotEnabled] = useState(site.autopilotEnabled ?? site.tiktok?.autopilot ?? true);
  const [autopilotPerDay, setAutopilotPerDay] = useState(Math.max(0, Math.min(20, Number(site.autopilotPerDay ?? site.tiktok?.perDay ?? 3))));
  const platformKeys = ["tiktok","facebook","youtube","snapchat","instagram","twitch","x","linkedin"] as const;
  const platformLabels: Record<typeof platformKeys[number], string> = { tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", snapchat: "Snapchat", instagram: "Instagram", twitch: "Twitch", x: "X / Twitter", linkedin: "LinkedIn" };
  const [autopilotProfiles, setAutopilotProfiles] = useState<Record<string, any>>(() => Object.fromEntries(
    platformKeys.map((k) => {
      const legacy = Array.isArray(site.autopilotProfiles?.[k]?.hours) && site.autopilotProfiles[k].hours.length
        ? site.autopilotProfiles[k].hours.map((h:number) => h * 3600) : [3600,7200,10800,14400,18000,21600];
      const selected = Array.isArray(site.autopilotProfiles?.[k]?.durationsSeconds) && site.autopilotProfiles[k].durationsSeconds.length
        ? site.autopilotProfiles[k].durationsSeconds : legacy;
      return [k, { enabled: site.autopilotProfiles?.[k]?.enabled !== false, videosPerDay: Number(site.autopilotProfiles?.[k]?.videosPerDay ?? 3), durationsSeconds: selected, hours: selected.filter((s:number)=>s%3600===0).map((s:number)=>s/3600), trendDriven: site.autopilotProfiles?.[k]?.trendDriven !== false }];
    })
  ));
  const togglePlatformDuration = (platform: string, seconds: number) => setAutopilotProfiles((old) => {
    const current = old[platform] || { durationsSeconds: [] };
    const selected = Array.isArray(current.durationsSeconds) ? current.durationsSeconds : [];
    const next = selected.includes(seconds) ? selected.filter((s: number) => s !== seconds) : [...selected, seconds].sort((a:number,b:number)=>a-b);
    return { ...old, [platform]: { ...current, durationsSeconds: next, hours: next.filter((s:number)=>s%3600===0).map((s:number)=>s/3600) } };
  });
  const addCustomDuration = (platform: string) => {
    const input = customDuration[platform] || { value: "", unit: "min" as const };
    const n = Number(input.value);
    if (!Number.isFinite(n) || n <= 0) return;
    const seconds = Math.round(n * (input.unit === "h" ? 3600 : 60));
    if (seconds < 60 || seconds > 21600) return;
    setAutopilotProfiles((old) => {
      const current = old[platform] || {};
      const selected = Array.isArray(current.durationsSeconds) ? current.durationsSeconds : [];
      const next = Array.from(new Set([...selected, seconds])).sort((a:number,b:number)=>a-b);
      return { ...old, [platform]: { ...current, durationsSeconds: next, hours: next.filter((x:number)=>x%3600===0).map((x:number)=>x/3600) } };
    });
    setCustomDuration((old) => ({ ...old, [platform]: { value: "", unit: input.unit } }));
  };

  const defaultEmotions = Array.isArray(site.autopilotEmotions) && site.autopilotEmotions.length === 7
    ? site.autopilotEmotions : ["romantique","drôle","triste","dramatique","romantique","drôle","neutre"];
  const [emotions, setEmotions] = useState<string[]>(defaultEmotions);
  const [promoEnabled, setPromoEnabled] = useState(site.promotion?.enabled ?? true);
  const [promoUrl, setPromoUrl] = useState(site.promotion?.url || "");
  const [promoCta, setPromoCta] = useState(site.promotion?.cta || "Veuillez cliquer sur mon profil, puis sur le lien dans ma bio pour accéder à Wesh Star IA et générer vos propres vidéos gratuitement.");
  const [promoSpoken, setPromoSpoken] = useState(site.promotion?.spoken ?? true);
  const [saved, setSaved] = useState(false);
  const [customDuration, setCustomDuration] = useState<Record<string, { value: string; unit: "min" | "h" }>>({});
  const router = useRouter();

  const setField = (k: string, v: number) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site: {
          name, tagline, accentColor, logoUrl: logoUrl.trim(), logoEmoji, themePreset, promotionPricing: { pricePer1000Views, minViews: minPromoViews, maxViews: maxPromoViews }, maintenance, defaultLocale: locale,
          longVideoCreatorSharePercent: creatorShare, longVideoAdBreaksEnabled: longVideoAdBreaks, longVideoAdIntervalMinutes: adInterval,
          communityEnabled, socialNetworkEnabled, autoPublishToCommunity, autopilotCrossPostAllPlatforms, allowUserAccounts, allowModeratorAccounts,
          maxDailyGenerations: f.maxDailyGenerations,
          maxConcurrentJobsPerUser: f.maxConcurrentJobsPerUser,
          adminDailyJobs: f.adminDailyJobs,
          platforms: pl,
          autopilotEnabled,
          autopilotPerDay,
          autopilotEmotions: emotions,
          autopilotDurationOptionsSeconds: DURATION_OPTIONS,
          autopilotProfiles,
          promotion: { enabled: promoEnabled, url: promoUrl.trim(), cta: promoCta.trim(), spoken: promoSpoken },
          tiktok: { ...(site.tiktok || {}), autopilot: autopilotEnabled, perDay: autopilotPerDay }
        },
        video: { clipSeconds, ...f }
      })
    });
    setSaved(res.ok);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  const num = (label: string, k: string, step = 1) => (
    <label className="block text-sm">
      <span className="text-zinc-400">{label}</span>
      <input type="number" step={step} min={0} value={f[k as keyof typeof f]}
        onChange={(e) => setField(k, Number(e.target.value))}
        className="input mt-1" />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="card max-w-3xl space-y-3 border-blue-500/20 bg-blue-500/5 p-5">
        <h3 className="font-bold text-blue-300">🔵 Contrôles de lancement</h3>
        <p className="text-xs text-zinc-500">Ces interrupteurs sont contrôlés uniquement par le compte Admin. La communauté reste invisible tant que tu ne l'actives pas.</p>
        <button type="button" onClick={() => setSocialNetworkEnabled(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-violet-500/30 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">📱 Activer le mode Réseau social</span><span className="block text-xs text-zinc-500">Activé : après connexion, l’utilisateur arrive sur le fil vidéo avec six options en bas, dont Studio IA. Désactivé : il arrive directement dans le Studio IA.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${socialNetworkEnabled ? "bg-violet-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${socialNetworkEnabled ? "left-6" : "left-1"}`} /></span>
        </button>
        <button type="button" onClick={() => setCommunityEnabled(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">🌟 Publier sur Wesh Star + Feed communautaire</span><span className="block text-xs text-zinc-500">Affiche le bouton de publication et la rubrique Feed à tous les utilisateurs.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${communityEnabled ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${communityEnabled ? "left-6" : "left-1"}`} /></span>
        </button>
        <button type="button" onClick={() => setAutoPublishToCommunity(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">🤖 Publier automatiquement aussi sur Wesh Star IA</span><span className="block text-xs text-zinc-500">Après une génération Autopilot terminée, ajoute la vidéo au Feed Wesh Star si la communauté est activée. Indépendant de la publication sur les réseaux sociaux.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${autoPublishToCommunity ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${autoPublishToCommunity ? "left-6" : "left-1"}`} /></span>
        </button>
        <button type="button" onClick={() => setAutopilotCrossPostAllPlatforms(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">📣 Republier la même vidéo sur tous les réseaux compatibles</span><span className="block text-xs text-zinc-500">Si activé, une vidéo Autopilot est envoyée à chaque réseau activé et connecté qui accepte sa durée. Les plateformes incompatibles sont ignorées; chaque réseau doit avoir ses autorisations API.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${autopilotCrossPostAllPlatforms ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${autopilotCrossPostAllPlatforms ? "left-6" : "left-1"}`} /></span>
        </button>
        <button type="button" onClick={() => setAllowUserAccounts(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">👤 Autoriser les nouveaux comptes utilisateurs</span><span className="block text-xs text-zinc-500">Désactiver empêche les nouvelles inscriptions. Les comptes existants restent gérables.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${allowUserAccounts ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${allowUserAccounts ? "left-6" : "left-1"}`} /></span>
        </button>
        <button type="button" onClick={() => setAllowModeratorAccounts(v => !v)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-blue-500/20 bg-zinc-950/40 px-4 py-3 text-left">
          <span><span className="block text-sm font-semibold">🛡️ Autoriser les comptes Modérateur</span><span className="block text-xs text-zinc-500">Désactiver bloque les nouvelles invitations/promotions de modérateurs.</span></span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full ${allowModeratorAccounts ? "bg-blue-500" : "bg-zinc-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${allowModeratorAccounts ? "left-6" : "left-1"}`} /></span>
        </button>
      </div>

      <div className="card max-w-2xl space-y-4 p-5">
        <h3 className="font-bold">⚙️ Paramètres généraux</h3>
        <label className="block text-sm"><span className="text-zinc-400">Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>
        <label className="block text-sm"><span className="text-zinc-400">Slogan affiché / description courte</span>
          <input value={tagline} maxLength={180} onChange={(e) => setTagline(e.target.value)} className="input mt-1" />
        </label>
        <label className="flex items-center gap-3 text-sm"><span className="text-zinc-400">Couleur principale du site</span><input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-zinc-700 bg-transparent" /><span className="font-mono text-xs">{accentColor}</span></label>
        <label className="block text-sm"><span className="text-zinc-400">URL du logo (URL HTTPS ou chemin local /...)</span><input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="/icons/icon-512.png" className="input mt-1" maxLength={500} /></label>
        <label className="block text-sm"><span className="text-zinc-400">Emoji si aucun logo n'est défini</span><input value={logoEmoji} onChange={e=>setLogoEmoji(e.target.value.slice(0,8))} className="input mt-1" maxLength={8} /></label>
        <label className="block text-sm"><span className="text-zinc-400">Style général</span><select value={themePreset} onChange={e=>setThemePreset(e.target.value)} className="input mt-1"><option value="midnight">Midnight — noir et jaune</option><option value="ocean">Ocean — bleu profond</option><option value="violet">Violet — créatif</option><option value="forest">Forest — vert profond</option></select></label>
        <div className="rounded-xl border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Aperçu</p><div className="mt-2 flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: ({midnight:"#09090b",ocean:"#071827",violet:"#170d24",forest:"#071b14"} as Record<string,string>)[themePreset] }}><span className="grid h-9 w-9 place-items-center rounded-xl" style={{backgroundColor:accentColor}}>{logoUrl ? <img src={logoUrl} alt="Logo aperçu" className="h-8 w-8 rounded-lg object-contain" /> : logoEmoji}</span><span className="font-bold text-white">{name || "Nom du site"}</span></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />{t.maintenance}</label>
        <label className="block text-sm"><span className="text-zinc-400">{t.language} (default)</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className="input mt-1">
            {LOCALES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="text-zinc-400">Clip length (seconds, per AI scene)</span>
          <input type="number" min={3} value={clipSeconds} onChange={(e) => setClipSeconds(Number(e.target.value))} className="input mt-1" />
        </label>
      </div>

      <div className="card max-w-3xl space-y-4 p-5">
        <h3 className="font-bold">📣 Tarification des vues sponsorisées</h3>
        <p className="text-sm text-zinc-500">Définis le tarif de diffusion. Les vues sont comptées uniquement pour les utilisateurs connectés qui regardent au moins 5 secondes; la portée finale dépend de l’audience disponible.</p>
        <label className="block text-sm"><span className="text-zinc-400">Prix pour 1 000 vues qualifiées (€)</span><input type="number" min="0.1" max="1000" step="0.1" value={pricePer1000Views} onChange={e=>setPricePer1000Views(Number(e.target.value))} className="input mt-1" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm"><span className="text-zinc-400">Vues minimum par campagne</span><input type="number" min="100" max="100000" step="100" value={minPromoViews} onChange={e=>setMinPromoViews(Number(e.target.value))} className="input mt-1" /></label><label className="block text-sm"><span className="text-zinc-400">Vues maximum par campagne</span><input type="number" min="100" max="1000000" step="100" value={maxPromoViews} onChange={e=>setMaxPromoViews(Number(e.target.value))} className="input mt-1" /></label></div>
        <p className="text-xs text-zinc-500">Exemple au tarif de 10 € / 1 000 vues : 5 000 vues = 50 €. Les prix sont recalculés et validés côté serveur.</p>
      </div>
      <div className="card max-w-3xl space-y-4 p-5">
        <h3 className="font-bold">💰 Monétisation des vidéos longues</h3>
        <p className="text-xs text-zinc-500">Réglages de politique de rémunération. Le pourcentage s’applique aux revenus publicitaires nets réellement attribués aux vidéos longues éligibles, pas au nombre de vues ni au budget de sponsoring.</p>
        <label className="block text-sm"><span className="text-zinc-400">Part des revenus publicitaires nets reversée au créateur (%)</span>
          <input type="number" min={0} max={100} step={1} value={creatorShare} onChange={(e) => setCreatorShare(Math.max(0, Math.min(100, Number(e.target.value))))} className="input mt-1" />
          <span className="mt-1 block text-xs text-zinc-500">Valeur initiale : 60 %. Vérifie les conditions du programme et les coûts avant de publier cette promesse.</span>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={longVideoAdBreaks} onChange={(e) => setLongVideoAdBreaks(e.target.checked)} />Activer la configuration des pauses publicitaires sur les vidéos longues</label>
        <label className="block text-sm"><span className="text-zinc-400">Intervalle cible entre pauses publicitaires (minutes)</span>
          <input type="number" min={3} max={60} value={adInterval} onChange={(e) => setAdInterval(Math.max(3, Math.min(60, Number(e.target.value))))} className="input mt-1" />
        </label>
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">Important : ces paramètres enregistrent la politique souhaitée. Ils ne garantissent pas que des publicités seront insérées dans le lecteur ni que les revenus seront calculés/payés automatiquement. Le lecteur vidéo, le suivi des impressions valides, le partenaire publicitaire et le système de paiements créateurs doivent être intégrés et testés séparément.</p>
      </div>

      <div>
        <h3 className="mb-3 font-bold">🤖 Autopilot automatique</h3>
        <div className="card max-w-3xl space-y-4 p-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={autopilotEnabled} onChange={(e) => setAutopilotEnabled(e.target.checked)} />
            Activer l'Autopilot
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Vidéos automatiques par jour — valeur globale de secours (0–1000)</span>
            <input type="number" min={0} max={1000} value={autopilotPerDay} onChange={(e) => setAutopilotPerDay(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))} className="input mt-1 !w-32" />
          </label>
          <div>
            <div className="mb-2 text-sm font-semibold">Émotion programmée par jour</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEEKDAYS.map((day, i) => (
                <label key={day} className="text-sm"><span className="text-zinc-400">{day}</span>
                  <select value={emotions[i]} onChange={(e) => setEmotions((old) => old.map((v,j) => j === i ? e.target.value : v))} className="input mt-1">
                    {EMOTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="mb-2 text-sm font-semibold">📲 Profils automatiques par plateforme</div>
            <p className="mb-3 text-xs text-zinc-500">Les boutons rapides restent disponibles, mais tu peux aussi écrire exactement la durée voulue en minutes ou en heures. Le plafond natif/API de chaque plateforme reste automatiquement respecté.</p>
            <div className="space-y-3">
              {platformKeys.map((k) => {
                const profile = autopilotProfiles[k] || {};
                const hours = Array.isArray(profile.hours) ? profile.hours : [];
                return <div key={k} className="rounded-lg border border-zinc-800 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-semibold text-sm">{platformLabels[k]}</div>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
                      <input type="checkbox" checked={profile.enabled !== false} onChange={(e) => setAutopilotProfiles((old) => ({ ...old, [k]: { ...old[k], enabled: e.target.checked } }))} />
                      activé
                    </label>
                  </div>
                  <label className="mt-3 block text-xs text-zinc-400">Vidéos automatiques par jour
                    <input type="number" min={0} max={1000} value={profile.videosPerDay ?? 3}
                      onChange={(e) => setAutopilotProfiles((old) => ({ ...old, [k]: { ...old[k], videosPerDay: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) } }))}
                      className="input mt-1 !w-32" />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((seconds) => {
                      const unavailable = seconds > PLATFORM_MAX[k];
                      const selected = Array.isArray(profile.durationsSeconds) && profile.durationsSeconds.includes(seconds);
                      return <label key={seconds} title={unavailable ? `Dépasse le plafond de publication configuré pour ${platformLabels[k]}` : undefined} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${unavailable ? "border-zinc-900 text-zinc-700" : "border-zinc-700"}`}>
                        <input type="checkbox" disabled={unavailable} checked={selected && !unavailable} onChange={() => togglePlatformDuration(k, seconds)} />
                        {durationLabel(seconds)}
                      </label>;
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-zinc-700 p-3">
                    <label className="text-xs text-zinc-400">Ajouter une durée personnalisée
                      <input type="number" min={1} step="1" value={customDuration[k]?.value ?? ""}
                        onChange={(e) => setCustomDuration((old) => ({ ...old, [k]: { value: e.target.value, unit: old[k]?.unit || "min" } }))}
                        placeholder="ex. 45" className="input mt-1 !w-28" />
                    </label>
                    <select value={customDuration[k]?.unit || "min"} onChange={(e) => setCustomDuration((old) => ({ ...old, [k]: { value: old[k]?.value || "", unit: e.target.value as "min" | "h" } }))} className="input !w-24">
                      <option value="min">minutes</option><option value="h">heures</option>
                    </select>
                    <button type="button" onClick={() => addCustomDuration(k)} className="btn-primary btn-sm">+ Ajouter</button>
                    <span className="text-[11px] text-zinc-500">1–360 min ou 1–6 h selon la plateforme.</span>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-500">{Array.isArray(profile.durationsSeconds) && profile.durationsSeconds.length ? `Durées autorisées : ${profile.durationsSeconds.map((s:number)=>durationLabel(s)).join(", ")}` : "Aucune durée sélectionnée — l’Autopilot ignorera cette plateforme."}</div>
                </div>;
              })}
            </div>
          </div>
          <p className="text-xs text-zinc-500">Les profils restent séparés par plateforme : l’Autopilot choisit aléatoirement une durée parmi celles cochées, puis publie automatiquement quand le compte et les permissions API sont disponibles. Les limites imposées par chaque réseau social restent applicables au moment de la publication.</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold">📣 Promotion automatique</h3>
        <div className="card max-w-3xl space-y-4 p-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={promoEnabled} onChange={(e) => setPromoEnabled(e.target.checked)} />
            Ajouter automatiquement la promotion de Wesh Star IA
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Lien officiel à promouvoir</span>
            <input type="url" value={promoUrl} onChange={(e) => setPromoUrl(e.target.value)} placeholder="https://ton-domaine.com" className="input mt-1" />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Phrase d'appel à l'action (CTA)</span>
            <textarea value={promoCta} onChange={(e) => setPromoCta(e.target.value)} rows={3} className="input mt-1" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={promoSpoken} onChange={(e) => setPromoSpoken(e.target.checked)} />
            Faire prononcer automatiquement le CTA à la fin de toutes les vidéos
          </label>
          <p className="text-xs text-zinc-500">Le lien est ajouté aux publications et, si cette option est activée, le CTA est prononcé automatiquement à la fin de chaque vidéo générée. La modification directe de la bio dépend des permissions de chaque réseau social.</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold">🌐 Publication automatique</h3>
        <div className="card p-5">
          <p className="mb-3 text-xs text-zinc-500">Sélectionne les plateformes autorisées. La publication ne se fait que si le compte correspondant est réellement connecté.</p>
          <div className="flex flex-wrap gap-4">
            {(["tiktok","facebook","youtube","snapchat","instagram","twitch","x","linkedin"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pl[k]} onChange={(e) => setPl((p0) => ({ ...p0, [k]: e.target.checked }))} />
                {k === "tiktok" ? "🎵 TikTok" : k === "facebook" ? "📘 Facebook" : k === "youtube" ? "▶️ YouTube" : k === "snapchat" ? "👻 Snapchat" : k === "instagram" ? "📸 Instagram" : k === "twitch" ? "🟣 Twitch" : k === "x" ? "𝕏 X / Twitter" : "💼 LinkedIn"}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold">🛡️ {t.sec_protection}</h3>
        <div className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          {num(t.cost_per_clip, "costPerClipEur", 0.05)}
          {num(t.global_max_scenes, "maxScenesPerJob")}
          {num(t.scene_timeout_min, "sceneTimeoutMinutes")}
          {num(t.job_max_attempts, "maxAttempts")}
          {num(t.scene_max_attempts, "maxSceneAttempts")}
          {num(t.global_daily_cap, "maxDailyGenerations")}
          {num(t.max_concurrent, "maxConcurrentJobsPerUser")}
          {num(t.admin_daily_cap, "adminDailyJobs")}
        </div>
      </div>

      <button onClick={save} className="btn-primary btn-md mt-4">{saved ? "✓ " + t.saved : t.save}</button>
    </div>
  );
}
