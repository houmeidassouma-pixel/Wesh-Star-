import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const settings = readFileSync(new URL('../src/lib/settings.ts', import.meta.url), 'utf8');
const form = readFileSync(new URL('../src/components/SettingsForm.tsx', import.meta.url), 'utf8');
test('long-video creator share defaults to 60% and is bounded 0..100', () => {
  assert.match(settings, /longVideoCreatorSharePercent:\s*60/);
  assert.match(settings, /Math\.max\(0, Math\.min\(100, Math\.floor\(Number\(raw\?\.site\?\.longVideoCreatorSharePercent/);
});
test('long-video ad-break settings are admin-configurable and documented as not an ad-server integration', () => {
  assert.match(form, /Monétisation des vidéos longues/);
  assert.match(form, /longVideoAdBreaksEnabled/);
  assert.match(form, /longVideoAdIntervalMinutes/);
  assert.match(form, /ne garantissent pas que des publicités seront insérées/);
});
