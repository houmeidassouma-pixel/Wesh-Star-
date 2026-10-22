import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const currencies = new Set(["EUR", "XOF", "USD", "GBP"]);
const country = /^[A-Z]{2}$/;
const safeImage = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) return undefined;
  try { const u = new URL(value); return u.protocol === "https:" ? u.toString() : undefined; } catch { return undefined; }
};

export async function GET(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
  const c = String(url.searchParams.get("country") || "").toUpperCase();
  const params: unknown[] = [];
  let where = "p.status='active'";
  if (q) { params.push(`%${q}%`); where += ` and (p.title ilike $${params.length} or p.description ilike $${params.length} or p.category ilike $${params.length})`; }
  if (country.test(c)) { params.push(c); where += ` and (p.country_code::text=$${params.length} or $${params.length}=any(p.shipping_countries))`; }
  where += " and p.stock_quantity > 0";
  params.push(access.user.id);
  where += ` and p.seller_id <> $${params.length}`;
  const result = await query(`select p.id,p.seller_id,p.title,p.description,p.category,p.image_url,p.price_minor,p.currency,p.country_code,p.stock_quantity,p.shipping_countries,p.created_at,coalesce(pr.username,pr.email,'Wesh Star seller') as seller_label from public.shop_products p left join public.profiles pr on pr.id=p.seller_id where ${where} order by p.created_at desc limit 100`, params);
  const own = await query(`select id,title,description,category,image_url,price_minor,currency,country_code,stock_quantity,shipping_countries,status,created_at from public.shop_products where seller_id=$1 order by created_at desc limit 100`, [access.user.id]);
  return NextResponse.json({ products: result.rows, ownProducts: own.rows });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("shop-listing:" + clientKey(req, access.user.id), 5, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = String(body.category || "other").trim().slice(0, 60) || "other";
  const currency = String(body.currency || "EUR").toUpperCase();
  const countryCode = String(body.countryCode || "").toUpperCase();
  const price = Number(body.price);
  const stock = Number(body.stockQuantity ?? 1);
  const imageUrl = safeImage(body.imageUrl);
  const shippingCountries: string[] = Array.isArray(body.shippingCountries) ? Array.from(new Set<string>(body.shippingCountries.map((x: unknown) => String(x).toUpperCase()).filter((x: string) => country.test(x)))).slice(0, 30) : [];
  if (title.length < 3 || title.length > 120 || description.length < 5 || description.length > 4000) return NextResponse.json({ error: "INVALID_TITLE_OR_DESCRIPTION" }, { status: 400 });
  if (!currencies.has(currency) || !country.test(countryCode) || !Number.isFinite(price) || price <= 0 || (currency === "XOF" && !Number.isInteger(price)) || price > 10_000_000 || !Number.isInteger(stock) || stock < 1 || stock > 100000 || imageUrl === undefined) return NextResponse.json({ error: "INVALID_PRODUCT_FIELDS" }, { status: 400 });
  const created = await query(`insert into public.shop_products(seller_id,title,description,category,image_url,price_minor,currency,country_code,stock_quantity,shipping_countries) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,title,description,category,image_url,price_minor,currency,country_code,stock_quantity,shipping_countries,status,created_at`, [access.user.id, title, description, category, imageUrl, Math.round(price * 100), currency, countryCode, stock, shippingCountries]);
  return NextResponse.json({ product: created.rows[0] }, { status: 201 });
}


export async function PATCH(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("shop-listing-manage:" + clientKey(req, access.user.id), 30, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["pause", "activate", "stock"].includes(action)) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  if (action === "stock") {
    const stock = Number(body.stockQuantity);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return NextResponse.json({ error: "INVALID_STOCK" }, { status: 400 });
    const updated = await query("update public.shop_products set stock_quantity=$1, status=case when $1=0 then 'paused' else status end, updated_at=now() where id=$2 and seller_id=$3 returning id,status,stock_quantity", [stock,id,access.user.id]);
    if (!updated.rows[0]) return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, product: updated.rows[0] });
  }
  const status = action === "pause" ? "paused" : "active";
  const updated = await query("update public.shop_products set status=$1, updated_at=now() where id=$2 and seller_id=$3 and ( $1='paused' or stock_quantity > 0 ) returning id,status,stock_quantity", [status,id,access.user.id]);
  if (!updated.rows[0]) return NextResponse.json({ error: "PRODUCT_NOT_FOUND_OR_EMPTY_STOCK" }, { status: 404 });
  return NextResponse.json({ ok: true, product: updated.rows[0] });
}
