import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
test("communications are disabled by default in the example environment", () => {
  const env = readFileSync(join(root, ".env.example"), "utf8");
  assert.match(env, /COMMUNICATIONS_ENABLED=false/);
});
test("private messages and call signaling are stored separately from video-generation quota", () => {
  const sql = readFileSync(join(root, "db/migrations/20261017_private_messages_calls.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.private_messages/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.communication_calls/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.call_signals/i);
  assert.doesNotMatch(sql, /hour_credits_seconds|usage_counters/i);
});
test("documentation does not claim calls are production-ready", () => {
  const doc = readFileSync(join(root, "COMMUNICATIONS_SELF_HOSTED.md"), "utf8");
  assert.match(doc, /ne prétend pas que les appels audio\/vidéo sont prêts à l'emploi/i);
  assert.match(doc, /TURN/i);
});
