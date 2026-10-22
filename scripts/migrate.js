// Applies db/schema.sql to DATABASE_URL. Safe to run repeatedly
// (every statement in that file is idempotent: "create table if not
// exists", "add column if not exists", "create or replace function", ...).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) { console.error("DATABASE_URL is not set"); process.exit(1); }
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  const client = new Client({ connectionString: conn, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query(sql);
    // Also apply incremental migrations (idempotent files, sorted by name).
    const mdir = path.join(__dirname, "..", "db", "migrations");
    if (fs.existsSync(mdir)) {
      for (const f of fs.readdirSync(mdir).filter((x) => x.endsWith(".sql")).sort()) {
        await client.query(fs.readFileSync(path.join(mdir, f), "utf8"));
        console.log("  applied migration " + f);
      }
    }
    console.log("✅ Wesh Star IA database schema applied.");
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error("❌ Migration failed:", e.message); process.exit(1); });
