import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("LiveKit self-hosted service, media ports and required public URL are documented", () => {
  const compose = read("docker-compose.yml");
  const tokenRoute = read("src/app/api/live/token/route.ts");
  const stage = read("src/components/live/LiveKitStage.tsx");
  assert.match(compose, /livekit\/livekit-server/);
  assert.match(compose, /50000-50100:50000-50100\/udp/);
  assert.match(tokenRoute, /LIVEKIT_PUBLIC_URL/);
  assert.match(tokenRoute, /live_session_blocks/);
  assert.match(stage, /setMicrophoneEnabled/);
  assert.match(stage, /setCameraEnabled/);
});

test("admin branding exposes editable site name, logo and theme preset", () => {
  const form = read("src/components/SettingsForm.tsx");
  const shell = read("src/components/AppShell.tsx");
  const settings = read("src/lib/settings.ts");
  assert.match(form, /setLogoUrl/);
  assert.match(form, /setThemePreset/);
  assert.match(shell, /siteName/);
  assert.match(shell, /logoUrl/);
  assert.match(settings, /themePreset: \["midnight", "ocean", "violet", "forest"\]/);
});
