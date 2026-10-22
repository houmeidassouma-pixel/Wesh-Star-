import { Pool } from "pg";

// Wesh Star IA's own PostgreSQL connection (self-hosted, no external control
// plane). DATABASE_URL points at the "postgres" service in docker-compose
// (or any Postgres instance the operator runs/owns).
declare global { // reuse the pool across Next.js hot-reloads in dev
  // eslint-disable-next-line no-var
  var __weshPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__weshPgPool) {
    const conn = process.env.DATABASE_URL;
    if (!conn) throw new Error("DATABASE_URL is not configured");
    global.__weshPgPool = new Pool({
      connectionString: conn,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }
  return global.__weshPgPool;
}

export async function query(text: string, params: any[] = []) {
  return getPool().query(text, params);
}

export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
