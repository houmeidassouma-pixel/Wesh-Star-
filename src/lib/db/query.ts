import { getPool } from "./pool";

// ---------------------------------------------------------------------------
// Minimal Postgres-backed re-implementation of the small subset of the
// supabase-js query builder that Wesh Star IA's code actually calls
// (.from().select/eq/in/is/gte/lte/order/limit/single/maybeSingle,
// .insert/.update/.upsert/.delete, .rpc). Same {data,error} result shape,
// so every existing route/component keeps working unchanged.
// ---------------------------------------------------------------------------

export type DbResult<T = any> = { data: T | null; error: { message: string; code?: string } | null; count?: number | null };

type Filter = { col: string; op: "eq" | "in" | "is" | "gte" | "lte"; val: any };

// Tables whose natural conflict target isn't "id" (used by .upsert() when no
// onConflict is given).
const DEFAULT_CONFLICT: Record<string, string> = { site_settings: "key" };

function ident(name: string): string {
  // Table/column names in this codebase are always our own hardcoded
  // strings (never user input), so a light allow-list is enough.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error("invalid identifier: " + name);
  return '"' + name + '"';
}

class QueryBuilder<T = any> implements PromiseLike<DbResult<T[]>> {
  private table: string;
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private cols = "*";
  private countOpt: "exact" | null = null;
  private headOpt = false;
  private filters: Filter[] = [];
  private payload: any = null;
  private conflictCols: string | null = null;
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private singleMode: "one" | "maybe" | null = null;

  constructor(table: string) { this.table = table; }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }): this {
    if (this.action === "select") this.cols = cols;
    else this.cols = cols; // RETURNING list for insert/update/upsert
    if (opts?.count) this.countOpt = opts.count;
    if (opts?.head) this.headOpt = true;
    return this;
  }
  eq(col: string, val: any): this { this.filters.push({ col, op: "eq", val }); return this; }
  in(col: string, val: any[]): this { this.filters.push({ col, op: "in", val }); return this; }
  is(col: string, val: null): this { this.filters.push({ col, op: "is", val }); return this; }
  gte(col: string, val: any): this { this.filters.push({ col, op: "gte", val }); return this; }
  lte(col: string, val: any): this { this.filters.push({ col, op: "lte", val }); return this; }
  order(col: string, opts?: { ascending?: boolean }): this { this.orderCol = col; this.orderAsc = opts?.ascending !== false; return this; }
  limit(n: number): this { this.limitN = n; return this; }

  insert(row: Record<string, any> | Record<string, any>[]): this { this.action = "insert"; this.payload = row; return this; }
  update(row: Record<string, any>): this { this.action = "update"; this.payload = row; return this; }
  upsert(row: Record<string, any>, opts?: { onConflict?: string }): this {
    this.action = "upsert"; this.payload = row;
    this.conflictCols = opts?.onConflict || DEFAULT_CONFLICT[this.table] || "id";
    return this;
  }
  delete(): this { this.action = "delete"; return this; }

  private whereClause(params: any[]): string {
    if (!this.filters.length) return "";
    const parts = this.filters.map((f) => {
      if (f.op === "is") return `${ident(f.col)} is null`;
      if (f.op === "in") { params.push(f.val); return `${ident(f.col)} = any($${params.length})`; }
      const op = f.op === "eq" ? "=" : f.op === "gte" ? ">=" : "<=";
      params.push(f.val);
      return `${ident(f.col)} ${op} $${params.length}`;
    });
    return " where " + parts.join(" and ");
  }

  private async exec(): Promise<DbResult<any>> {
    try {
      const params: any[] = [];
      let sql: string;

      if (this.action === "select") {
        if (this.headOpt && this.countOpt) {
          sql = `select count(*)::int as c from ${ident(this.table)}${this.whereClause(params)}`;
          const r = await getPool().query(sql, params);
          return { data: null, error: null, count: r.rows[0]?.c ?? 0 };
        }
        sql = `select ${this.cols === "*" ? "*" : this.cols} from ${ident(this.table)}${this.whereClause(params)}`;
        if (this.orderCol) sql += ` order by ${ident(this.orderCol)} ${this.orderAsc ? "asc" : "desc"}`;
        if (this.limitN != null) sql += ` limit ${Math.max(0, Math.floor(this.limitN))}`;
        const r = await getPool().query(sql, params);
        return this.finish(r.rows);
      }

      if (this.action === "insert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
        const valuesSql = rows.map((row) => {
          const placeholders = cols.map((c) => { params.push(row[c] ?? null); return `$${params.length}`; });
          return "(" + placeholders.join(",") + ")";
        }).join(",");
        sql = `insert into ${ident(this.table)} (${cols.map(ident).join(",")}) values ${valuesSql} returning ${this.cols}`;
        const r = await getPool().query(sql, params);
        return this.finish(r.rows);
      }

      if (this.action === "update") {
        const cols = Object.keys(this.payload);
        const setSql = cols.map((c) => { params.push(this.payload[c] ?? null); return `${ident(c)} = $${params.length}`; }).join(",");
        sql = `update ${ident(this.table)} set ${setSql}${this.whereClause(params)} returning ${this.cols}`;
        const r = await getPool().query(sql, params);
        return this.finish(r.rows);
      }

      if (this.action === "upsert") {
        const cols = Object.keys(this.payload);
        const placeholders = cols.map((c) => { params.push(this.payload[c] ?? null); return `$${params.length}`; });
        const conflictCols = this.conflictCols!.split(",").map((s) => s.trim());
        const updateSql = cols.filter((c) => !conflictCols.includes(c)).map((c) => `${ident(c)} = excluded.${ident(c)}`).join(",");
        sql = `insert into ${ident(this.table)} (${cols.map(ident).join(",")}) values (${placeholders.join(",")}) ` +
          `on conflict (${conflictCols.map(ident).join(",")}) ` +
          (updateSql ? `do update set ${updateSql}` : "do nothing") +
          ` returning ${this.cols}`;
        const r = await getPool().query(sql, params);
        return this.finish(r.rows);
      }

      // delete
      sql = `delete from ${ident(this.table)}${this.whereClause(params)} returning ${this.cols}`;
      const r = await getPool().query(sql, params);
      return this.finish(r.rows);
    } catch (e: any) {
      return { data: null, error: { message: e?.message || "database error", code: e?.code } };
    }
  }

  private finish(rows: any[]): DbResult<any> {
    if (this.singleMode === "one") {
      if (rows.length !== 1) return { data: null, error: { message: rows.length === 0 ? "no rows" : "multiple rows" } };
      return { data: rows[0], error: null };
    }
    if (this.singleMode === "maybe") {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  async single(): Promise<DbResult<any>> { this.singleMode = "one"; return this.exec(); }
  async maybeSingle(): Promise<DbResult<any>> { this.singleMode = "maybe"; return this.exec(); }

  // Makes `await builder` work even without an explicit terminal call.
  then<TR1 = DbResult<T[]>, TR2 = never>(
    onfulfilled?: ((value: DbResult<T[]>) => TR1 | PromiseLike<TR1>) | null,
    onrejected?: ((reason: any) => TR2 | PromiseLike<TR2>) | null
  ): PromiseLike<TR1 | TR2> {
    return this.exec().then(onfulfilled as any, onrejected as any);
  }
}

// ---------------------------------------------------------------------------
// RPC: calls our own Postgres functions (see db/schema.sql). Kept as
// "rpc" only for naming continuity with the rest of the codebase — nothing
// here talks to Supabase.
// ---------------------------------------------------------------------------
const RPC_KIND: Record<string, "scalar" | "void" | "set"> = {
  claim_generation_job: "set",
  claim_social_publication_job: "set",
  consume_generation_quota: "scalar",
  consume_generation_time_quota: "scalar",
  refund_generation_time_quota: "void",
  refund_generation_quota: "void",
  check_global_daily_cap: "scalar",
  consume_hour_credits: "scalar",
  refund_hour_credits: "void",
  add_hour_credits: "void"
};

async function rpc(fnName: string, args: Record<string, any> = {}): Promise<DbResult<any>> {
  try {
    const kind = RPC_KIND[fnName] || "set";
    const params: any[] = [];
    const namedArgs = Object.entries(args).map(([k, v]) => { params.push(v); return `${k} := $${params.length}`; }).join(",");
    if (kind === "set") {
      const sql = `select * from public.${fnName}(${namedArgs})`;
      const r = await getPool().query(sql, params);
      return { data: r.rows, error: null };
    }
    if (kind === "void") {
      const sql = `select public.${fnName}(${namedArgs})`;
      await getPool().query(sql, params);
      return { data: null, error: null };
    }
    // scalar
    const sql = `select public.${fnName}(${namedArgs}) as v`;
    const r = await getPool().query(sql, params);
    return { data: r.rows[0] ? r.rows[0].v : null, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "database error", code: e?.code } };
  }
}

// ---------------------------------------------------------------------------
// Public client factory. `admin` and `server` both point at the same direct
// Postgres connection — Wesh Star IA's own server code is the trust boundary
// (every route already checks role/ownership itself before querying), so
// there is no separate anon/service-role split to reproduce here.
// ---------------------------------------------------------------------------
export function createDbClient() {
  return {
    from<T = any>(table: string) { return new QueryBuilder<T>(table); },
    rpc
  };
}
