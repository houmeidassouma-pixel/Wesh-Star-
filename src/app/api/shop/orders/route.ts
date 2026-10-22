import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { query, withTransaction } from "@/lib/db/pool";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const country = /^[A-Z]{2}$/;
export async function GET() {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const result = await query(`select o.id,o.product_id,o.buyer_id,o.seller_id,o.quantity,o.unit_price_minor,o.currency,o.shipping_country,o.buyer_message,o.status,o.created_at,o.updated_at,p.title,case when o.buyer_id=$1 then coalesce(s.username,s.email,'Seller') else coalesce(b.username,b.email,'Buyer') end as other_party from public.shop_order_requests o join public.shop_products p on p.id=o.product_id left join public.profiles s on s.id=o.seller_id left join public.profiles b on b.id=o.buyer_id where o.buyer_id=$1 or o.seller_id=$1 order by o.created_at desc limit 100`, [access.user.id]);
  return NextResponse.json({ orders: result.rows, currentUserId: access.user.id });
}

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (access.profile?.blocked) return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
  if (!rateLimit("shop-order:" + clientKey(req, access.user.id), 8, 60_000)) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const productId = String(body.productId || "");
  const quantity = Number(body.quantity || 1);
  const shippingCountry = String(body.shippingCountry || "").toUpperCase();
  const message = String(body.message || "").trim().slice(0, 1000);
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || !country.test(shippingCountry)) return NextResponse.json({ error: "INVALID_ORDER_FIELDS" }, { status: 400 });
  try {
    const result = await withTransaction(async (c) => {
      const product = await c.query(`select * from public.shop_products where id=$1 and status='active' for update`, [productId]);
      const p = product.rows[0];
      if (!p) throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { status: 404 });
      if (p.seller_id === access.user!.id) throw Object.assign(new Error("CANNOT_BUY_OWN_PRODUCT"), { status: 400 });
      if (quantity > Number(p.stock_quantity)) throw Object.assign(new Error("INSUFFICIENT_STOCK"), { status: 409 });
      if (p.country_code !== shippingCountry && !(p.shipping_countries || []).includes(shippingCountry)) throw Object.assign(new Error("SELLER_DOES_NOT_SHIP_TO_COUNTRY"), { status: 400 });
      const order = await c.query(`insert into public.shop_order_requests(product_id,buyer_id,seller_id,quantity,unit_price_minor,currency,shipping_country,buyer_message) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,status,created_at`, [p.id, access.user!.id, p.seller_id, quantity, p.price_minor, p.currency, shippingCountry, message]);
      return order.rows[0];
    });
    return NextResponse.json({ order: result, notice: "ORDER_REQUEST_ONLY_NO_PAYMENT_TAKEN" }, { status: 201 });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    return NextResponse.json({ error: status === 500 ? "ORDER_REQUEST_FAILED" : e.message }, { status });
  }
}

export async function PATCH(req: Request) {
  const access = await getAccess();
  if (!access.user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["accept", "decline", "cancel"].includes(action)) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  try {
    await withTransaction(async (c) => {
      const found = await c.query(`select id,product_id,buyer_id,seller_id,quantity,status from public.shop_order_requests where id=$1 for update`, [id]);
      const o = found.rows[0];
      if (!o) throw Object.assign(new Error("ORDER_NOT_FOUND"), { status: 404 });
      if (action === "cancel") {
        if (o.buyer_id !== access.user!.id && o.seller_id !== access.user!.id) throw Object.assign(new Error("NOT_ALLOWED"), { status: 403 });
        if (!["requested", "accepted"].includes(o.status)) throw Object.assign(new Error("ORDER_NOT_CANCELLABLE"), { status: 409 });
        if (o.status === "accepted") await c.query(`update public.shop_products set stock_quantity=least(100000,stock_quantity+$2),updated_at=now() where id=$1`, [o.product_id, o.quantity]);
        await c.query(`update public.shop_order_requests set status='cancelled',updated_at=now() where id=$1`, [id]);
      } else {
        if (o.status !== "requested") throw Object.assign(new Error("ORDER_NOT_PENDING"), { status: 409 });
        if (o.seller_id !== access.user!.id) throw Object.assign(new Error("NOT_ALLOWED"), { status: 403 });
        if (action === "accept") {
          const stock = await c.query(`update public.shop_products set stock_quantity=stock_quantity-$2,updated_at=now() where id=$1 and status='active' and stock_quantity >= $2 returning id`, [o.product_id, o.quantity]);
          if (!stock.rowCount) throw Object.assign(new Error("INSUFFICIENT_STOCK"), { status: 409 });
        }
        await c.query(`update public.shop_order_requests set status=$2,updated_at=now() where id=$1`, [id, action === "accept" ? "accepted" : "declined"]);
      }
    });
    return NextResponse.json({ ok: true, notice: "NO_PAYMENT_TAKEN" });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    return NextResponse.json({ error: status === 500 ? "ORDER_UPDATE_FAILED" : e.message }, { status });
  }
}
