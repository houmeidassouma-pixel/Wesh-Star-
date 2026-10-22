// Single source of truth for "which mannequins/appearances exist" — mirrors
// src/lib/voices.ts but for visual appearance instead of voice.
//
// Honesty note, same as for voices: there is no per-character reference
// image or identity-locking embedding in this project's video pipeline
// (src/lib/video-provider.ts sends one text prompt per clip to a
// text-to-video model). A "mannequin" here is a fixed appearance
// description ("Rockstar — male, leather jacket, sunglasses") woven into
// the prompt every time that character appears, not a pinned reference
// image. That keeps a character's DESCRIBED appearance consistent and
// distinct from the others in the same video — it does not guarantee
// pixel-identical framing/face the way an image-conditioned or LoRA-based
// pipeline would. If the video model you configure in
// The self-hosted video engine can receive a reference/start image per character,
// that's a further integration step beyond what this catalog does today.
export const CHARACTER_CATALOG = [
  { id: "herrschmidt", label: "👨‍💼 Herr Schmidt", desc: "middle-aged man, business suit" },
  { id: "fraumeyer", label: "👩‍💼 Frau Meyer", desc: "middle-aged woman, business attire" },
  { id: "chris", label: "👨‍🦱 Chris", desc: "young man, curly hair, casual clothes" },
  { id: "lena", label: "👱‍♀️ Lena", desc: "young woman, blonde hair" },
  { id: "bart", label: "🧔 Bart", desc: "man with a full beard" },
  { id: "ronja", label: "👩‍🦰 Ronja", desc: "woman with red hair" },
  { id: "opawilli", label: "👴 Opa Willi", desc: "elderly man, grandfatherly" },
  { id: "omalotti", label: "👵 Oma Lotti", desc: "elderly woman, grandmotherly" },
  { id: "ben", label: "👦 Ben (Kind)", desc: "young boy, child" },
  { id: "mia", label: "👧 Mia (Kind)", desc: "young girl, child" },
  { id: "senior", label: "👨‍🦳 Senior", desc: "senior man, grey hair" },
  { id: "ayla", label: "🧕 Ayla", desc: "woman wearing a headscarf" },
  { id: "detektiv", label: "🕵️ Detektiv", desc: "detective, trench coat and hat" },
  { id: "aerztin", label: "👩‍⚕️ Ärztin", desc: "woman in a doctor's coat" },
  { id: "koch", label: "👨‍🍳 Koch", desc: "man in chef's whites and hat" },
  { id: "bauarbeiter", label: "👷 Bauarbeiter", desc: "construction worker, hard hat and vest" },
  { id: "kuenstlerin", label: "🧑‍🎨 Künstlerin", desc: "artist, paint-splattered apron" },
  { id: "wissenschaftlerin", label: "👩‍🔬 Wissenschaftlerin", desc: "scientist, lab coat" },
  { id: "hero", label: "🦸 Hero", desc: "male superhero costume" },
  { id: "heroine", label: "🦸‍♀️ Heroine", desc: "female superhero costume" },
  { id: "astro", label: "👩‍🚀 Astronautin", desc: "astronaut in a spacesuit" },
  { id: "ninja", label: "🥷 Ninja", desc: "ninja, masked and dressed in black" },
  { id: "magi", label: "🧙 Magi", desc: "wizard, robe and staff" },
  { id: "fee", label: "🧚 Fee", desc: "fairy with wings" },
  { id: "vamp", label: "🧛 Vampir", desc: "vampire, pale with a cape" },
  { id: "ghost", label: "👻 Geist", desc: "ghost, translucent white" },
  { id: "santa", label: "🎅 Weihnachtsmann", desc: "Santa Claus outfit" },
  { id: "meerjungfrau", label: "🧜‍♀️ Meerjungfrau", desc: "mermaid" },
  { id: "rock", label: "👨‍🎤 Rockstar", desc: "rockstar, leather jacket, sunglasses" },
  { id: "banani", label: "🍌 Banani", desc: "cheerful banana-shaped mascot character" },
  { id: "fraise", label: "🍓 Fraise", desc: "cheerful strawberry-shaped mascot character, bright red strawberry body with green leafy crown" },
  { id: "doggo", label: "🐶 Doggo", desc: "cartoon dog character" },
  { id: "kitty", label: "🐱 Kitty", desc: "cartoon cat character" },
  { id: "foxy", label: "🦊 Foxi", desc: "cartoon fox character" },
  { id: "panda", label: "🐼 Panda", desc: "cartoon panda character" },
  { id: "leo", label: "🦁 Leo", desc: "cartoon lion character" },
  { id: "bunny", label: "🐰 Bunny", desc: "cartoon rabbit character" },
  { id: "uni", label: "🦄 Uni", desc: "cartoon unicorn character" },
  { id: "dino", label: "🦖 Dino", desc: "cartoon dinosaur character" },
  { id: "frogi", label: "🐸 Frogi", desc: "cartoon frog character" },
  { id: "robo", label: "🤖 Robo", desc: "cartoon robot character" }
] as const;

export type CharacterId = typeof CHARACTER_CATALOG[number]["id"];
const BY_ID = new Map(CHARACTER_CATALOG.map((c) => [c.id, c]));

export function characterIdAt(index: number): CharacterId {
  return CHARACTER_CATALOG[((index % CHARACTER_CATALOG.length) + CHARACTER_CATALOG.length) % CHARACTER_CATALOG.length].id;
}

export function characterDesc(id: string | undefined | null, fallbackIndex = 0): string {
  const c = id ? BY_ID.get(id as CharacterId) : undefined;
  if (c) return c.desc;
  return CHARACTER_CATALOG[((fallbackIndex % CHARACTER_CATALOG.length) + CHARACTER_CATALOG.length) % CHARACTER_CATALOG.length].desc;
}

export function isValidCharacterId(id: unknown): id is CharacterId {
  return typeof id === "string" && BY_ID.has(id as CharacterId);
}
