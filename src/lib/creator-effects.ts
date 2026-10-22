// Effets vidéo intégrés (liste FIXE dans le code). L'admin ne peut modifier que : actif, gratuit/payant, prix en jetons.
// Chaque effet a un rendu aperçu (CSS/canvas, navigateur) et un rendu export (filtre FFmpeg, serveur).
// Les filtres FFmpeg ne viennent jamais du navigateur ni de la base : pas d'injection de commande possible.
export type BuiltinEffect = { id: string; label: string; css: string; ffmpeg: string };

export const BUILTIN_EFFECTS: BuiltinEffect[] = [
  { id: "normal",   label: "Naturel",       css: "none",                                                   ffmpeg: "" },
  { id: "mono",     label: "Noir et blanc", css: "grayscale(1) contrast(1.12)",                            ffmpeg: "hue=s=0,eq=contrast=1.12" },
  { id: "sepia",    label: "Sépia",         css: "sepia(.8)",                                              ffmpeg: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131" },
  { id: "bright",   label: "Lumineux",      css: "brightness(1.15) contrast(1.05)",                        ffmpeg: "eq=brightness=0.06:contrast=1.05" },
  { id: "cinema",   label: "Cinéma",        css: "contrast(1.15) saturate(.85) sepia(.12)",                ffmpeg: "eq=contrast=1.15:saturation=0.85,colorbalance=rs=.06:gs=.02:bs=-.06" },
  { id: "vivid",    label: "Couleurs",      css: "saturate(1.65) contrast(1.05)",                          ffmpeg: "eq=saturation=1.65:contrast=1.05" },
  { id: "warm",     label: "Chaud",         css: "sepia(.25) saturate(1.2)",                               ffmpeg: "colorbalance=rm=.10:bm=-.10,eq=saturation=1.2" },
  { id: "cool",     label: "Froid",         css: "hue-rotate(-10deg) saturate(1.1) brightness(1.03)",      ffmpeg: "colorbalance=rm=-.08:bm=.10,eq=saturation=1.1" },
  { id: "vintage",  label: "Vintage",       css: "sepia(.4) contrast(.95) saturate(.9) brightness(1.05)",  ffmpeg: "eq=contrast=0.95:saturation=0.9:brightness=0.03,colorbalance=rs=.08:bs=-.08" },
  { id: "dramatic", label: "Dramatique",    css: "contrast(1.35) saturate(.9) brightness(.95)",            ffmpeg: "eq=contrast=1.35:saturation=0.9:brightness=-0.03" },
  { id: "dreamy",   label: "Rêveur",        css: "blur(.6px) brightness(1.08) saturate(1.2)",              ffmpeg: "gblur=sigma=0.8,eq=brightness=0.05:saturation=1.2" },
];

export function effectById(id: string): BuiltinEffect | undefined {
  return BUILTIN_EFFECTS.find((e) => e.id === id);
}
