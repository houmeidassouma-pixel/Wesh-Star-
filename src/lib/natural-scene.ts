import { callLLM } from "@/lib/llm";

export type NaturalEntity = {
  name: string;
  kind: "person" | "character" | "animal" | "food" | "object" | "vehicle" | "place" | "other";
  description: string;
  role?: string;
};

export type NaturalScene = {
  entities: NaturalEntity[];
  relationships: string[];
  actions: string[];
  setting: string;
  visualStyle: string;
};

const EMPTY: NaturalScene = { entities: [], relationships: [], actions: [], setting: "", visualStyle: "" };

function cleanJson(raw: string): any {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

export async function parseNaturalScene(prompt: string): Promise<NaturalScene> {
  const source = String(prompt || "").trim().slice(0, 4000);
  if (!source) return EMPTY;
  try {
    const raw = await callLLM(
      `Tu es le moteur de compréhension de scènes de Wesh Star IA. Analyse la demande utilisateur sans la réécrire. Identifie TOUS les éléments visuels importants, pas seulement les personnages: humains, mannequins, fruits, légumes, aliments, animaux, objets, véhicules, lieux, etc. Un élément jamais vu auparavant doit quand même être conservé comme entité générique avec une description visuelle précise. Identifie aussi relations (couple, amis, famille, entre eux), actions et décor. Réponds UNIQUEMENT avec un JSON valide sous cette forme: {"entities":[{"name":"...","kind":"person|character|animal|food|object|vehicle|place|other","description":"...","role":"..."}],"relationships":["..."],"actions":["..."],"setting":"...","visualStyle":"..."}. Maximum 50 entités.`,
      source,
      1800
    );
    const data = cleanJson(raw);
    const entities = Array.isArray(data.entities) ? data.entities.slice(0, 50).map((e: any) => ({
      name: String(e?.name || "élément").slice(0, 80),
      kind: ["person", "character", "animal", "food", "object", "vehicle", "place", "other"].includes(String(e?.kind)) ? String(e.kind) as NaturalEntity["kind"] : "other",
      description: String(e?.description || e?.name || "élément visuel").slice(0, 500),
      role: e?.role ? String(e.role).slice(0, 160) : undefined
    })) : [];
    return {
      entities,
      relationships: Array.isArray(data.relationships) ? data.relationships.slice(0, 50).map(String).map((x: string) => x.slice(0, 300)) : [],
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 50).map(String).map((x: string) => x.slice(0, 300)) : [],
      setting: String(data.setting || "").slice(0, 500),
      visualStyle: String(data.visualStyle || "").slice(0, 300)
    };
  } catch {
    return EMPTY;
  }
}

export function sceneVisualPrompt(scene: NaturalScene): string {
  if (!scene.entities.length && !scene.setting && !scene.actions.length) return "";
  const entities = scene.entities.map((e) => `${e.name}: ${e.description}${e.role ? ` (${e.role})` : ""}`).join("; ");
  return `VISUAL SCENE PLAN — faithfully render every requested element. Elements: ${entities || "none"}. Relationships: ${scene.relationships.join("; ") || "none"}. Actions: ${scene.actions.join("; ") || "none"}. Setting: ${scene.setting || "as described by the user"}. Style: ${scene.visualStyle || "natural cinematic"}. Do not silently remove or replace named elements.`;
}
