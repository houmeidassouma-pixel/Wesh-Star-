import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("international shop has idempotent schema and authenticated product routes", () => {
  const migration = read("../db/migrations/20261029_international_shop.sql");
  const products = read("../src/app/api/shop/products/route.ts");
  assert.match(migration, /create table if not exists public\.shop_products/);
  assert.match(migration, /create table if not exists public\.shop_order_requests/);
  assert.match(migration, /check \(currency in \('EUR','XOF','USD','GBP'\)\)/);
  assert.match(products, /getAccess\(\)/);
  assert.match(products, /safeImage/);
  assert.match(products, /rateLimit/);
});

test("shop orders are requests only and seller acceptance reserves stock transactionally", () => {
  const orders = read("../src/app/api/shop/orders/route.ts");
  const ui = read("../src/components/ShopMarketplace.tsx");
  assert.match(orders, /ORDER_REQUEST_ONLY_NO_PAYMENT_TAKEN/);
  assert.match(orders, /withTransaction/);
  assert.match(orders, /stock_quantity=stock_quantity-\$2/);
  assert.match(ui, /Aucun paiement n'a été effectué/);
  assert.match(ui, /Wesh Star Shop/);
});

test("shop is available in the authenticated navigation", () => {
  assert.match(read("../src/components/AppShell.tsx"), /href: "\/shop"/);
  assert.match(read("../src/app/(app)/shop/page.tsx"), /ShopMarketplace/);
});


test("seller can pause/reactivate a listing and update stock without changing another seller's product", () => {
  const products = read("../src/app/api/shop/products/route.ts");
  const ui = read("../src/components/ShopMarketplace.tsx");
  assert.match(products, /export async function PATCH/);
  assert.match(products, /where id=\$2 and seller_id=\$3/);
  assert.match(products, /\["pause", "activate", "stock"\]/);
  assert.match(ui, /Mettre en pause/);
  assert.match(ui, /Réactiver/);
});
