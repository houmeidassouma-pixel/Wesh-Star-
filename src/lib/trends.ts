// Wesh Star IA local trend generator.
// Real platform trend feeds require platform-owned APIs/permissions and are
// therefore deliberately not a hidden dependency of the core application.
// Autopilot remains functional without any third-party trend service.
const LOCAL_TOPICS = [
  "a surprising everyday life hack",
  "a cute animal doing something unexpected",
  "a satisfying before/after transformation",
  "a quick fun fact that sounds unbelievable but is true",
  "a relatable daily-life moment everyone recognizes",
  "a short feel-good story with a twist ending",
  "a funny situation that happens in everyday life",
  "a simple challenge people can try at home"
];

export async function getTrendingTopic(): Promise<string> {
  return LOCAL_TOPICS[Math.floor(Math.random() * LOCAL_TOPICS.length)];
}

export function promptFromTopic(topic: string): string {
  return "Short vertical social video about: " + topic + ". Eye-catching opening shot, upbeat pacing, clear ending.";
}
