"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useJobs, jobPercent, doneScenes } from "./useJobs";
import { VOICE_CATALOG, voiceIdAt } from "@/lib/voices";
import { CHARACTER_CATALOG, characterIdAt } from "@/lib/characters";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random().toString(36).slice(2);
}

const MAX_PERSONS = 50;
const EMOTIONS = [
  { v: "neutre", l: "😐 Neutre" },
  { v: "romantique", l: "💕 Romantique" },
  { v: "drôle", l: "😂 Drôle" },
  { v: "triste", l: "😢 Triste" },
  { v: "colère", l: "😠 Colère" },
  { v: "peur", l: "😱 Peur" },
  { v: "dramatique", l: "🎭 Dramatique" }
];

export default function GenerateStudio({ t, maxSeconds, availableSeconds, clipSeconds }: { t: Record<string, string>; maxSeconds: number; availableSeconds: number; clipSeconds: number }) {
  const { jobs, reload } = useJobs(3000);
  const searchParams = useSearchParams();
  const [sounds, setSounds] = useState<Array<{id:string;title:string;creator:string;uses:number}>>([]);
  const [soundId, setSoundId] = useState("");
  const [soundLoading, setSoundLoading] = useState(true);
  useEffect(() => {
    const sharedTemplate = searchParams.get("template");
    if (sharedTemplate) {
      try {
        const decoded = sharedTemplate.slice(0, 3000);
        if (decoded.trim()) setPrompt(decoded);
      } catch {}
    }
  }, [searchParams]);
  useEffect(() => {
    const wanted = searchParams.get("sound") || "";
    if (wanted) setSoundId(wanted);
    fetch("/api/sounds/library").then(r => r.ok ? r.json() : {sounds:[]})
      .then(d => { const list = Array.isArray(d.sounds) ? d.sounds : []; setSounds(list); if (wanted && !list.some((x:any) => x.id === wanted)) setSoundId(""); })
      .catch(() => setSounds([])).finally(() => setSoundLoading(false));
  }, [searchParams]);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(Math.min(60, Math.max(10, Math.min(maxSeconds || 10, Math.max(0, availableSeconds)))));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState(newKey);

  // ---- Characters ----------------------------------------------------
  const [autoCast, setAutoCast] = useState(true); // "Automatique": let the system pick/name characters
  const [personCount, setPersonCount] = useState(2);
  const [names, setNames] = useState<string[]>(["", ""]);
  const [voices, setVoices] = useState<string[]>([voiceIdAt(0), voiceIdAt(1)]);
  const [mannequins, setMannequins] = useState<string[]>([characterIdAt(0), characterIdAt(1)]);
  const setPersonCountSafe = (n: number) => {
    const c = Math.max(1, Math.min(MAX_PERSONS, Math.floor(n) || 1));
    setPersonCount(c);
    setNames((prev) => {
      const next = prev.slice(0, c);
      while (next.length < c) next.push("");
      return next;
    });
    setVoices((prev) => {
      const next = prev.slice(0, c);
      while (next.length < c) next.push(voiceIdAt(next.length));
      return next;
    });
    setMannequins((prev) => {
      const next = prev.slice(0, c);
      while (next.length < c) next.push(characterIdAt(next.length));
      return next;
    });
  };

  // ---- AI script generation -------------------------------------------
  const [style, setStyle] = useState("");
  const [stylePreset, setStylePreset] = useState("");
  const [emotion, setEmotion] = useState("neutre");
  const [improveNote, setImproveNote] = useState("");
  const [aiBusy, setAiBusy] = useState<"write" | "improve" | null>(null);

  const [platform, setPlatform] = useState("");
  const PLATFORM_FORMATS: Record<string, { label: string; ratio: string; resolution: string; note: string }> = {
    youtube: { label: "YouTube", ratio: "16:9", resolution: "832×480", note: "Horizontal — vidéo classique" },
    tiktok: { label: "TikTok", ratio: "9:16", resolution: "480×832", note: "Vertical — plein écran" },
    reels: { label: "Instagram Reels", ratio: "9:16", resolution: "480×832", note: "Vertical — plein écran" },
    shorts: { label: "YouTube Shorts", ratio: "9:16", resolution: "480×832", note: "Vertical — plein écran" },
    feed: { label: "Instagram Feed", ratio: "1:1", resolution: "640×640", note: "Carré — publication classique" },
    x: { label: "X", ratio: "16:9", resolution: "832×480", note: "Horizontal" },
    linkedin: { label: "LinkedIn", ratio: "16:9", resolution: "832×480", note: "Horizontal" },
    facebook: { label: "Facebook", ratio: "16:9", resolution: "832×480", note: "Horizontal" },
  };
  const selectedFormat = platform ? PLATFORM_FORMATS[platform] : null;

  const [videoLanguage, setVideoLanguage] = useState("auto");
  const [customVideoLanguage, setCustomVideoLanguage] = useState("");
  const videoLangValue = () => videoLanguage === "custom" ? customVideoLanguage.trim() || "auto" : videoLanguage;

  const generateScript = async () => {
    setAiBusy("write");
    setMsg(null);
    const res = await fetch("/api/ai/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        names: autoCast ? [] : names.filter((n) => n.trim()),
        style, emotion, seconds,
        language: videoLangValue(),
        videoType: (document.getElementById("vidPlat") as HTMLSelectElement | null)?.value || ""
      })
    });
    const data = await res.json();
    setAiBusy(null);
    if (data.ok) setPrompt(data.script);
    else setMsg({ ok: false, text: data.error === "BLOCKED" ? t.blocked : (data.error || "Erreur IA") });
  };

  const improveScript = async () => {
    if (!prompt.trim()) return;
    setAiBusy("improve");
    setMsg(null);
    const res = await fetch("/api/ai/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt, instruction: improveNote })
    });
    const data = await res.json();
    setAiBusy(null);
    if (data.ok) setPrompt(data.script);
    else setMsg({ ok: false, text: data.error === "BLOCKED" ? t.blocked : (data.error || "Erreur IA") });
  };

  // Durées proposées par pas de 10 secondes, de 10 secondes à 10 minutes maximum.
  // Le serveur impose aussi le plafond ; l’interface ne peut pas accorder des secondes supplémentaires.
  const GENERATION_MAX_SECONDS = 10 * 60;
  const effectiveMax = Math.min(GENERATION_MAX_SECONDS, maxSeconds || 10, Math.max(0, availableSeconds));
  // Requested selector: 10-second steps for the first 50 seconds, then whole minutes.
  const ALL_OPTIONS = [10, 20, 30, 40, 50, ...Array.from({ length: 10 }, (_, i) => (i + 1) * 60)];
  const options = ALL_OPTIONS.filter((s) => s <= effectiveMax);
  useEffect(() => {
    if (options.length && !options.includes(seconds)) setSeconds(options[options.length - 1]);
  }, [effectiveMax]);
  const fmt = (s: number) => (s < 60 ? `${s} ${t.sec_unit}` : `${s / 60} ${t.min_unit}`) + ` · ${Math.ceil(s / 10)} crédit${Math.ceil(s / 10) > 1 ? "s" : ""}`;
  const scenes = Math.max(1, Math.ceil(seconds / Math.max(3, clipSeconds || 10)));
  const job = jobs.find((j) => j.id === activeId) || null;

  const errorText = (data: any): string => {
    if (data.message === "BLOCKED") return t.blocked;
    switch (data.error) {
      case "MONTHLY_LIMIT":
      case "QUOTA_LIMIT": return t.monthly_limit;
      case "LENGTH": return t.length_error;
      case "RATE_LIMIT": return t.err_rate;
      case "CONCURRENT_LIMIT": return t.err_concurrent;
      case "COST_LIMIT": return t.err_cost;
      case "GLOBAL_LIMIT": return t.err_global;
      case "PLATFORM_REQUIRED": return "Choisis une plateforme cible.";
      case "PROMPT_REQUIRED": return "Écris un scénario ou génère un texte avant de lancer la vidéo.";
      case "PROMPT_TOO_LONG": return "Le scénario est trop long (maximum 12 000 caractères).";
      case "DIALOGUE_TOO_SHORT": return "Le texte est trop court pour ce nombre de personnages.";
      case "INSUFFICIENT_HOUR_CREDITS": return "Il ne te reste pas assez de minutes/crédits. Demande un quota à l’administrateur ou achète un pack disponible.";
      case "FREE_TRIAL_EXHAUSTED": return "Les deux essais gratuits sont terminés. Choisis un quota ou un abonnement pour continuer.";
      case "ACCOUNT_BLOCKED": return "Ce compte est temporairement bloqué. Contacte l’administrateur.";
      default: return data.message || data.error || "Error";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const personsMeta = autoCast ? null : names.slice(0, personCount).map((n, i) => ({
      name: n.trim(), role: "", voice: voices[i] || voiceIdAt(i), character: mannequins[i] || characterIdAt(i)
    }));
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt, seconds, idempotencyKey: idemKey,
        videoLanguage: videoLangValue(),
        colorScheme: (document.getElementById("colorScheme") as HTMLSelectElement | null)?.value || "gelb",
        voice: (document.getElementById("vidVoice") as HTMLSelectElement | null)?.value || "auto",
        character: (document.getElementById("vidChar") as HTMLSelectElement | null)?.value || "banani",
        sceneMode: "dialogue", // per-character line splitting + speaker attribution, always on
        platform,
        persons: personCount,
        personsMeta,
        soundId: soundId || null
      })
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setActiveId(data.jobId || null);
      setIdemKey(newKey());
      setMsg({ ok: true, text: data.duplicate ? t.duplicate_note : t.queued });
      setPrompt("");
      reload();
    } else {
      setMsg({ ok: false, text: errorText(data) });
    }
  };

  const act = async (action: string) => {
    if (!job) return;
    if (action === "delete" && !confirm(t.delete_confirm)) return;
    await fetch("/api/generations/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id })
    });
    if (action === "delete") setActiveId(null);
    reload();
  };

  const pct = job ? jobPercent(job) : 0;
  const statusBadge: Record<string, React.ReactNode> = {
    pending: <span className="badge-zinc">⏳ {t.st_pending}</span>,
    processing: <span className="badge-yellow"><span className="pulse-dot">●</span> {t.st_processing}</span>,
    done: <span className="badge-green">✓ {t.st_done}</span>,
    failed: <span className="badge-red">✕ {t.st_failed}</span>
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Prompt form */}
      <form onSubmit={submit} className="card animate-fade-up space-y-5 p-6 lg:col-span-3">
        <div>
          <h2 className="text-xl font-bold">{t.studio_title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t.prompt}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 p-4 space-y-2">
          <span className="lab">🎵 Musique de fond de la communauté</span>
          <p className="text-xs text-zinc-500">Choisis un son publié et réutilisable. Le son sera ajouté au rendu final si FFmpeg est installé et activé sur le serveur. Les droits de réutilisation sont vérifiés côté serveur.</p>
          <select className="input" value={soundId} onChange={e => setSoundId(e.target.value)}>
            <option value="">Aucun son ajouté</option>
            {sounds.map(s => <option key={s.id} value={s.id}>♪ {s.title} · @{s.creator} · {s.uses} utilisations</option>)}
          </select>
          {soundLoading && <p className="text-xs text-zinc-500">Chargement des sons…</p>}
          {!soundLoading && sounds.length === 0 && <p className="text-xs text-zinc-500">Aucun son réutilisable pour le moment. Tu peux découvrir les sons publiés dans la communauté.</p>}
          {soundId && <audio controls preload="none" className="w-full" src={`/api/sounds/${soundId}/audio`} />}
        </div>

        {/* ---------------- Characters ---------------- */}
        <div className="rounded-xl border border-zinc-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="lab">🧑‍🤝‍🧑 Personnages (1–{MAX_PERSONS})</span>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={autoCast} onChange={(e) => setAutoCast(e.target.checked)} />
              Automatique (mannequin + voix choisis pour chaque personnage)
            </label>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <input
              type="number" min={1} max={MAX_PERSONS} value={personCount}
              onChange={(e) => setPersonCountSafe(Number(e.target.value))}
              className="input !w-24"
            />
            <span className="text-xs text-zinc-500">
              Au-delà d'une quinzaine de personnages, la cohérence visuelle d'une vidéo générée par IA se dégrade — les noms et voix restent distincts, mais l'apparence peut se ressembler.
            </span>
          </div>

          {!autoCast && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {names.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={n}
                    onChange={(e) => setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder={"Personnage " + (i + 1) + " (ex : Ananas, Kevin…)"}
                    className="input flex-1"
                    maxLength={30}
                  />
                  <select
                    value={mannequins[i] || characterIdAt(i)}
                    onChange={(e) => setMannequins((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="input !w-36"
                    title="Mannequin/apparence de ce personnage"
                  >
                    {CHARACTER_CATALOG.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <select
                    value={voices[i] || voiceIdAt(i)}
                    onChange={(e) => setVoices((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="input !w-28"
                    title="Voix de ce personnage"
                  >
                    {VOICE_CATALOG.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              ))}
              <p className="text-xs text-zinc-500 sm:col-span-2">
                Chaque personnage garde le même mannequin et la même voix pendant toute la vidéo. Au-delà de {VOICE_CATALOG.length} personnages les voix se répètent, et au-delà de {CHARACTER_CATALOG.length} les mannequins aussi — mais toujours de façon stable pour un même nom, jamais mélangés entre personnages.
              </p>
            </div>
          )}
        </div>

        {/* ---------------- AI script generation ---------------- */}
        <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <span className="lab">✍️ Générer le texte automatiquement</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <select aria-label="Préréglage de style" value={stylePreset} onChange={(e) => { setStylePreset(e.target.value); if (e.target.value) setStyle(e.target.value); }} className="input">
              <option value="">Choisir un style (facultatif)…</option>
              <option value="publicité produit premium, démonstration claire et appel à l’action">🛍️ Publicité produit</option>
              <option value="cinématique, lumière de film, cadrages soignés">🎬 Cinématique</option>
              <option value="vidéo UGC naturelle, style créateur sur smartphone">📱 UGC / créateur</option>
              <option value="comédie courte, rythme rapide, chute amusante">😂 Comédie courte</option>
              <option value="documentaire réaliste, narration factuelle">🎥 Documentaire</option>
              <option value="anime stylisé, mouvements expressifs, couleurs vibrantes">✨ Anime</option>
              <option value="mode éditoriale, lookbook haut de gamme">👗 Mode / lookbook</option>
              <option value="conte fantastique, ambiance magique et immersive">🧙 Fantastique</option>
              <option value="recette culinaire, gros plans appétissants et gestes précis">🍜 Cuisine</option>
              <option value="clip musical, montage rythmé et visuels expressifs">🎵 Clip musical</option>
            </select>
            <input value={style} onChange={(e) => { setStyle(e.target.value); setStylePreset(""); }} placeholder="Ou écris ton propre style…" className="input" />
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className="input">
              {EMOTIONS.map((em) => <option key={em.v} value={em.v}>{em.l}</option>)}
            </select>
          </div>
          <button type="button" disabled={aiBusy !== null} onClick={generateScript} className="btn-secondary btn-sm w-full">
            {aiBusy === "write" ? "…" : "✨ Générer le scénario"}
          </button>
        </div>

        <textarea required rows={8} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={'Écris ton scénario ici, ou génère-le ci-dessus. Format recommandé pour plusieurs personnages :\nKEVIN: Salut Sarah !\nSARAH: Salut Kevin, ça va ?'}
          className="input min-h-[11rem] resize-y font-mono text-sm" />

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={improveNote} onChange={(e) => setImproveNote(e.target.value)}
            placeholder="Instruction pour l'amélioration (optionnel)"
            className="input flex-1"
          />
          <button type="button" disabled={aiBusy !== null || !prompt.trim()} onClick={improveScript} className="btn-secondary btn-sm">
            {aiBusy === "improve" ? "…" : "🪄 Améliorer le texte avec l'IA"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
        <label className="block text-sm">
          <span className="lab" style={{ marginBottom: 5 }}>📣 Ziel-Plattform — Pflicht, vor dem Generieren festlegen</span>
          <select id="vidPlat" className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">— Choisir une plateforme (obligatoire) —</option><option value="youtube">▶️ YouTube — 16:9</option><option value="tiktok">🎵 TikTok — 9:16</option><option value="reels">📸 Instagram Reels — 9:16</option><option value="shorts">📱 YouTube Shorts — 9:16</option><option value="feed">🖼️ Instagram Feed — 1:1</option><option value="x">𝕏 X — 16:9</option><option value="linkedin">💼 LinkedIn — 16:9</option><option value="facebook">👍 Facebook — 16:9</option></select>
          {selectedFormat && <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-white">Cadre automatique : {selectedFormat.label}</span><span className="badge-zinc">{selectedFormat.ratio}</span></div><div className="mt-1">{selectedFormat.resolution} · {selectedFormat.note}</div></div>}
        </label>
        <label className="block text-sm">
          <span className="lab" style={{ marginBottom: 5 }}>🗣️ Stimme (KI-Sprecher) — Solo/Narrator-Modus</span>
          <select id="vidVoice" className="input" defaultValue="auto"><option value="auto">🎙️ System-Standard</option><option value="aria">♀ Aria — weiblich, warm</option><option value="sarah">♀ Sarah — weiblich, klar</option><option value="charlotte">♀ Charlotte — weiblich, sanft</option><option value="alice">♀ Alice — weiblich, Erzählerin</option><option value="lisa">♀ Lisa — weiblich, energiegeladen</option><option value="roger">♂ Roger — männlich, tief</option><option value="george">♂ George — männlich, ruhig</option><option value="liam">♂ Liam — männlich, energiegeladen</option><option value="jonas">♂ Jonas — männlich, jung</option><option value="tom">♂ Tom — männlich, dokumentarisch</option><option value="nini">🧒 Nini — Kinderstimme</option><option value="felix">🧒 Felix — Kinderstimme</option><option value="erich">👴 Erich — Seniorenstimme</option><option value="grete">👵 Grete — Seniorenstimme</option><option value="river">⚧ River — neutral</option><option value="sam">⚧ Sam — neutral</option></select>
        </label>
        <label className="block text-sm" style={{ marginTop: 14 }}>
          <span className="lab" style={{ marginBottom: 5 }}>🎙️ {t.lab_videolang || "Sprache des Videos"}</span>
          <select id="videoLang" className="input" value={videoLanguage} onChange={(e) => setVideoLanguage(e.target.value)}><option value="auto">Auto (Prompt-Sprache)</option><option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option><option value="it">Italiano</option><option value="nl">Nederlands</option><option value="pl">Polski</option><option value="sv">Svenska</option><option value="da">Dansk</option><option value="nb">Norsk</option><option value="fi">Suomi</option><option value="cs">Čeština</option><option value="sk">Slovenčina</option><option value="sl">Slovenščina</option><option value="hr">Hrvatski</option><option value="sr">Српски</option><option value="bs">Bosanski</option><option value="mk">Македонски</option><option value="bg">Български</option><option value="ro">Română</option><option value="hu">Magyar</option><option value="el">Ελληνικά</option><option value="tr">Türkçe</option><option value="ru">Русский</option><option value="uk">Українська</option><option value="be">Беларуская</option><option value="kk">Қазақша</option><option value="az">Azərbaycanca</option><option value="uz">Oʻzbekcha</option><option value="ka">ქართული</option><option value="hy">Հայերեն</option><option value="lt">Lietuvių</option><option value="lv">Latviešu</option><option value="et">Eesti</option><option value="sq">Shqip</option><option value="ca">Català</option><option value="eu">Euskara</option><option value="gl">Galego</option><option value="is">Íslenska</option><option value="ga">Gaeilge</option><option value="mt">Malti</option><option value="fa">فارسی</option><option value="ar">العربية</option><option value="he">עברית</option><option value="ur">اردو</option><option value="ps">پښتو</option><option value="ku">Kurdî</option><option value="sd">سنڌي</option><option value="am">አማርኛ</option><option value="sw">Kiswahili</option><option value="ha">Hausa</option><option value="yo">Yorùbá</option><option value="ig">Igbo</option><option value="zu">isiZulu</option><option value="xh">isiXhosa</option><option value="af">Afrikaans</option><option value="so">Soomaali</option><option value="rw">Kinyarwanda</option><option value="lg">Luganda</option><option value="sn">chiShona</option><option value="ne">नेपाली</option><option value="hi">हिन्दी</option><option value="bn">বাংলা</option><option value="pa">ਪੰਜਾਬੀ</option><option value="gu">ગુજરાતી</option><option value="mr">मराठी</option><option value="ta">தமிழ்</option><option value="te">తెలుగు</option><option value="kn">ಕನ್ನಡ</option><option value="ml">മലയാളം</option><option value="si">සිංහල</option><option value="th">ไทย</option><option value="lo">ລາວ</option><option value="my">မြန်မာ</option><option value="km">ខ្មែរ</option><option value="vi">Tiếng Việt</option><option value="id">Bahasa Indonesia</option><option value="ms">Bahasa Melayu</option><option value="fil">Filipino</option><option value="jv">Basa Jawa</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="mn">Монгол</option><option value="ti">ትግርኛ</option><option value="custom">🌍 Autre langue (écrire le nom)</option></select>
          {videoLanguage === "custom" && (
            <input value={customVideoLanguage} onChange={(e) => setCustomVideoLanguage(e.target.value)} className="input mt-2" maxLength={40} placeholder="Ex. Yoruba, Wolof, Lingala…" />
          )}
        </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">{t.video_length}</span>
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="input !w-auto !py-1.5">
              {options.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
            </select>
          </label>
          <span className="badge-zinc">🧩 ≈ {scenes} {t.scenes_label}</span>
          {!options.length && <span className="badge-red">Quota du jour/mois épuisé</span>}
        </div>
        {msg && <p className={"rounded-lg border px-3 py-2 text-sm " + (msg.ok ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400")}>{msg.text}</p>}
        <label className="block text-sm" style={{ marginTop: 14 }}>
          <span className="lab" style={{ marginBottom: 5 }}>🎨 Farbe / Farbschema</span>
          <select id="colorScheme" className="input" defaultValue="gelb"><optgroup label="Paletten créatives"><option value="cinema">Cinéma (tons profonds)</option><option value="pastel">Pastel doux</option><option value="neon">Néon / cyberpunk</option><option value="vintage">Vintage chaud</option><option value="noir">Noir et blanc</option><option value="luxury">Luxe (noir et or)</option><option value="wesanderson">Symétrie et couleurs Wes Anderson</option><option value="documentary">Documentaire naturel</option><option value="anime">Anime vibrant</option><option value="earthy">Terre et nature</option></optgroup><optgroup label="Couleurs simples"><option value="rot">Rot</option><option value="blau">Blau</option><option value="gruen">Grün</option><option value="gelb">Gelb</option><option value="lila">Lila</option><option value="orange">Orange</option><option value="rosa">Rosa</option><option value="schwarz">Schwarz</option><option value="weiss">Weiß</option><option value="grau">Grau</option><option value="braun">Braun</option><option value="tuerkis">Türkis</option><option value="gold">Gold</option><option value="silber">Silber</option><option value="indigo">Indigo</option><option value="cyan">Cyan</option><option value="magenta">Magenta</option><option value="lime">Lime</option><option value="navy">Navy</option><option value="beige">Beige</option><option value="violett">Violett</option><option value="bordeaux">Bordeaux</option></optgroup></select>
        </label>
        <button disabled={loading || !options.length || !platform} className="btn-primary btn-lg w-full">
          {loading ? "…" : "🎬 " + t.generate}
        </button>
      </form>

      {/* Live render panel */}
      <div className="lg:col-span-2">
        {job ? (
          <div className="card animate-fade-up p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">{t.progress_label}</h3>
              {statusBadge[job.status]}
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-zinc-400">{job.prompt}</p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{doneScenes(job)}/{job.scenes} {t.scenes_label}</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                <div className={"h-full rounded-full bg-banana transition-all duration-500 " + (job.status === "processing" ? "progress-shimmer" : "")} style={{ width: pct + "%" }} />
              </div>
            </div>

            {job.status === "failed" && job.error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{job.error}</p>
            )}

            {job.status === "done" && (
              <div className="mt-4 space-y-3">
                <video controls preload="none" className="w-full rounded-xl border border-zinc-800" src={"/api/video/" + job.id} />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {job.status === "done" && (
                <>
                  <a href={"/api/video/" + job.id + "?download=1"} download className="btn-primary btn-sm flex-1">⬇ {t.download}</a>
                  <button type="button" className="btn-secondary btn-sm" onClick={async () => {
                    const url = new URL("/use-model", window.location.origin);
                    url.searchParams.set("template", job.prompt.slice(0, 3000));
                    try {
                      if (navigator.share) await navigator.share({ title: "Créer avec Wesh Star IA", text: "Utilise ce modèle dans Wesh Star IA", url: url.toString() });
                      else { await navigator.clipboard.writeText(url.toString()); setMsg({ ok: true, text: "Lien du modèle copié. Tu peux le partager sur TikTok ou ailleurs." }); }
                    } catch (error) {
                      if ((error as Error)?.name !== "AbortError") setMsg({ ok: false, text: "Impossible de partager automatiquement. Copie ce lien depuis le bouton de partage du navigateur." });
                    }
                  }}>↗ Partager le modèle</button>
                  <a href="https://www.tiktok.com/upload?lang=fr" target="_blank" rel="noreferrer" className="btn-secondary btn-sm" title="Télécharge d’abord la vidéo, puis sélectionne-la dans TikTok">Publier sur TikTok ↗</a>
                </>
              )}
              {job.status === "failed" && (
                <button onClick={() => act("retry")} className="btn-secondary btn-sm flex-1">↻ {t.retry}</button>
              )}
              <button onClick={() => act("delete")} className="btn-danger btn-sm">🗑 {t.delete}</button>
            </div>
          </div>
        ) : (
          <div className="card grid min-h-[20rem] animate-fade-up place-items-center p-6 text-center">
            <div>
              <div className="text-5xl">🎬</div>
              <p className="mt-3 max-w-xs text-sm text-zinc-500">{t.studio_empty}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
