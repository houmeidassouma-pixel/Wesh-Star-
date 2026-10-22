// Simple content moderation. Extend BLOCKED with your own terms or plug in an
// external moderation API (e.g. OpenAI Moderation, Hive) in moderateText().

const BLOCKED = [
  // sexual / explicit (EN/DE examples)
  "nude", "naked", "porn", "sex", "nsfw", "hentai",
  "nackt", "porno", "erotik",
  // violence / hate
  "beheading", "torture", "gore", "isis", "terror attack",
  // illegal
  "cp ", "child abuse", "kinderporno",
  // self-harm
  "suicide tutorial"
];

export function moderateText(text: string): { blocked: boolean; matched?: string } {
  const lower = " " + text.toLowerCase() + " ";
  for (const term of BLOCKED) {
    if (lower.includes(term)) return { blocked: true, matched: term };
  }
  return { blocked: false };
}
