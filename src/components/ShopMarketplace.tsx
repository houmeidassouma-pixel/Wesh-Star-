"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Product = { id:string; seller_id:string; title:string; description:string; category:string; image_url:string|null; price_minor:number; currency:string; country_code:string; stock_quantity:number; shipping_countries:string[]; status?:string; seller_label?:string; created_at:string };
type Order = { id:string; product_id:string; buyer_id:string; seller_id:string; quantity:number; unit_price_minor:number; currency:string; shipping_country:string; buyer_message:string; status:string; title:string; other_party:string; created_at:string };
const currencies = ["EUR","XOF","USD","GBP"];
const money = (minor:number,currency:string) => new Intl.NumberFormat(undefined,{style:"currency",currency,maximumFractionDigits:currency==="XOF"?0:2}).format(minor/100);

export default function ShopMarketplace() {
  const [products,setProducts] = useState<Product[]>([]);
  const [ownProducts,setOwnProducts] = useState<Product[]>([]);
  const [orders,setOrders] = useState<Order[]>([]);
  const [currentUserId,setCurrentUserId] = useState("");
  const [q,setQ] = useState("");
  const [country,setCountry] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [form,setForm] = useState({title:"",description:"",category:"other",imageUrl:"",price:"",currency:"EUR",countryCode:"DE",stockQuantity:"1",shippingCountries:"DE,FR,BE,BJ,CI,SN,NG"});
  const [shipping,setShipping] = useState<Record<string,string>>({});
  const [quantity,setQuantity] = useState<Record<string,string>>({});
  const [buyerMessage,setBuyerMessage] = useState<Record<string,string>>({});
  const [orderBusy,setOrderBusy] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(); if(q.trim()) params.set("q",q.trim()); if(country.trim()) params.set("country",country.trim().toUpperCase());
      const [p,o] = await Promise.all([fetch("/api/shop/products?"+params.toString(),{cache:"no-store"}),fetch("/api/shop/orders",{cache:"no-store"})]);
      const pd = await p.json(); const od = await o.json();
      if(!p.ok) throw new Error(pd.error || "Impossible de charger les produits.");
      setProducts(pd.products || []); setOwnProducts(pd.ownProducts || []); if(o.ok) { setOrders(od.orders || []); setCurrentUserId(od.currentUserId || ""); }
    } catch(e:any) { setMessage(e.message || "Erreur de chargement."); }
  },[q,country]);
  useEffect(()=>{ void load(); },[load]);
  const setField = (key:string,value:string) => setForm(prev=>({...prev,[key]:value}));
  const publish = async (e:FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/shop/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,price:Number(form.price),stockQuantity:Number(form.stockQuantity),shippingCountries:form.shippingCountries.split(/[ ,;]+/).filter(Boolean).map(x=>x.toUpperCase())})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error || "Impossible de publier le produit.");
      setMessage("Produit publié. Les demandes d'achat ne débitent pas encore de paiement : vendeur et acheteur doivent convenir du règlement et de la livraison."); setShowForm(false); setForm({title:"",description:"",category:"other",imageUrl:"",price:"",currency:"EUR",countryCode:"DE",stockQuantity:"1",shippingCountries:"DE,FR,BE,BJ,CI,SN,NG"}); await load();
    } catch(e:any) { setMessage(e.message || "Erreur."); } finally { setBusy(false); }
  };
  const requestOrder = async (p:Product) => {
    setOrderBusy(p.id); setMessage("");
    try {
      const res = await fetch("/api/shop/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:p.id,quantity:Number(quantity[p.id]||1),shippingCountry:(shipping[p.id]||"").toUpperCase(),message:buyerMessage[p.id]||""})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error || "Demande impossible.");
      setMessage("Demande envoyée au vendeur. Aucun paiement n'a été effectué."); await load();
    } catch(e:any) { setMessage(e.message || "Erreur."); } finally { setOrderBusy(""); }
  };
  const actOrder = async (id:string,action:string) => {
    setOrderBusy(id); setMessage("");
    try { const res=await fetch("/api/shop/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action})}); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Action impossible."); setMessage("Demande mise à jour. Aucun paiement n'a été effectué."); await load(); }
    catch(e:any){setMessage(e.message||"Erreur.");} finally{setOrderBusy("");}
  };
  const manageProduct = async (id:string,action:string,stockQuantity?:number) => {
    setOrderBusy(id);setMessage("");
    try { const res=await fetch("/api/shop/products",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,stockQuantity})}); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Modification impossible."); setMessage(action==="pause"?"Annonce mise en pause.":action==="activate"?"Annonce réactivée.":"Stock mis à jour."); await load(); }
    catch(e:any){setMessage(e.message||"Erreur.");} finally{setOrderBusy("");}
  };
  const ordersForMe = useMemo(()=>orders,[orders]);
  return <div className="space-y-6">
    <section className="card overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-violet-300">WESH STAR COMMERCE</p><h1 className="mt-2 text-3xl font-extrabold">Wesh Star Shop</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">Achetez et vendez entre pays. Les produits indiquent leur pays d'expédition et les destinations acceptées.</p></div><button className="btn-primary" onClick={()=>setShowForm(v=>!v)}>{showForm?"Fermer":"＋ Vendre un produit"}</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]"><input className="input w-full" placeholder="Rechercher un produit…" value={q} onChange={e=>setQ(e.target.value)} /><input className="input w-full" placeholder="Pays (ex. DE, BJ)" maxLength={2} value={country} onChange={e=>setCountry(e.target.value.toUpperCase())}/><button className="btn-secondary" onClick={()=>void load()}>Rechercher</button></div>
      {message && <p role="status" className="mt-4 rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">{message}</p>}
    </section>
    {showForm && <form onSubmit={publish} className="card space-y-4 p-5"><div><h2 className="text-lg font-bold">Publier un produit</h2><p className="mt-1 text-sm text-zinc-400">N'ajoute que des produits que tu as le droit de vendre. Le vendeur reste responsable de la conformité, de l'expédition et des retours.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nom du produit<input className="input mt-1 w-full" required minLength={3} maxLength={120} value={form.title} onChange={e=>setField("title",e.target.value)}/></label><label className="text-sm">Catégorie<select className="input mt-1 w-full" value={form.category} onChange={e=>setField("category",e.target.value)}>{["other","electronics","phones","clothing","shoes","home","beauty","accessories","digital"].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="text-sm sm:col-span-2">Description<textarea className="input mt-1 w-full" required minLength={5} maxLength={4000} rows={3} value={form.description} onChange={e=>setField("description",e.target.value)}/></label><label className="text-sm">Photo (URL HTTPS)<input className="input mt-1 w-full" type="url" placeholder="https://…" value={form.imageUrl} onChange={e=>setField("imageUrl",e.target.value)}/></label><div className="grid grid-cols-[1fr_100px] gap-2"><label className="text-sm">Prix<input className="input mt-1 w-full" type="number" min="0.01" step={form.currency==="XOF"?"1":"0.01"} required value={form.price} onChange={e=>setField("price",e.target.value)}/></label><label className="text-sm">Devise<select className="input mt-1 w-full" value={form.currency} onChange={e=>setField("currency",e.target.value)}>{currencies.map(x=><option key={x}>{x}</option>)}</select></label></div><label className="text-sm">Pays du vendeur (code ISO à 2 lettres)<input className="input mt-1 w-full" required minLength={2} maxLength={2} value={form.countryCode} onChange={e=>setField("countryCode",e.target.value.toUpperCase())}/></label><label className="text-sm">Stock<input className="input mt-1 w-full" type="number" min="1" max="100000" required value={form.stockQuantity} onChange={e=>setField("stockQuantity",e.target.value)}/></label><label className="text-sm sm:col-span-2">Pays d'expédition acceptés (codes séparés par virgules)<input className="input mt-1 w-full" value={form.shippingCountries} onChange={e=>setField("shippingCountries",e.target.value)} placeholder="DE, FR, BJ, CI, SN"/><span className="mt-1 block text-xs text-zinc-500">Les codes pays ne garantissent pas qu'un transporteur ou un service douanier soit disponible.</span></label></div><button className="btn-primary" disabled={busy}>{busy?"Publication…":"Publier le produit"}</button></form>}
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Produits disponibles</h2><span className="text-xs text-zinc-500">{products.length} résultat(s)</span></div>{products.length===0?<div className="card p-8 text-center text-sm text-zinc-400">Aucun produit pour cette recherche. Tu peux être le premier à publier un article.</div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map(p=><article key={p.id} className="card overflow-hidden"><div className="aspect-[4/3] bg-zinc-900">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-5xl">🛍️</div>}</div><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold">{p.title}</h3><span className="whitespace-nowrap font-extrabold text-violet-300">{money(p.price_minor,p.currency)}</span></div><p className="line-clamp-3 text-sm text-zinc-400">{p.description}</p><div className="flex flex-wrap gap-2 text-xs text-zinc-500"><span>{p.category}</span><span>·</span><span>Expédié depuis {p.country_code}</span><span>·</span><span>{p.stock_quantity} disponible(s)</span></div><p className="text-xs text-zinc-500">Vendeur : {p.seller_label||"Wesh Star seller"}</p><div className="space-y-2 border-t border-zinc-800 pt-3"><label className="block text-xs text-zinc-400">Pays de livraison<input className="input mt-1 w-full" placeholder="DE, BJ, FR…" maxLength={2} value={shipping[p.id]||""} onChange={e=>setShipping(s=>({...s,[p.id]:e.target.value.toUpperCase()}))}/></label><label className="block text-xs text-zinc-400">Quantité<input className="input mt-1 w-full" type="number" min="1" max={p.stock_quantity} value={quantity[p.id]||"1"} onChange={e=>setQuantity(s=>({...s,[p.id]:e.target.value}))}/></label><label className="block text-xs text-zinc-400">Message au vendeur (facultatif)<input className="input mt-1 w-full" maxLength={1000} value={buyerMessage[p.id]||""} onChange={e=>setBuyerMessage(s=>({...s,[p.id]:e.target.value}))}/></label><button className="btn-primary w-full" disabled={orderBusy===p.id||!shipping[p.id]} onClick={()=>void requestOrder(p)}>{orderBusy===p.id?"Envoi…":"Demander l'achat"}</button><p className="text-[11px] text-zinc-500">Pas de paiement intégré dans cette version : la demande ne débite aucun argent.</p></div></div></article>)}</div>}</section>
    <section className="card p-5"><h2 className="text-xl font-bold">Mes annonces</h2>{ownProducts.length===0?<p className="mt-2 text-sm text-zinc-500">Tes annonces apparaîtront ici.</p>:<div className="mt-3 divide-y divide-zinc-800">{ownProducts.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{p.title}</p><p className="text-xs text-zinc-500">{money(p.price_minor,p.currency)} · stock {p.stock_quantity} · {p.status}</p></div><div className="flex flex-wrap gap-2"><span className="text-xs text-zinc-500">{p.country_code}</span><button className="btn-secondary btn-sm" disabled={orderBusy===p.id} onClick={()=>void manageProduct(p.id,p.status==="active"?"pause":"activate")}>{p.status==="active"?"Mettre en pause":"Réactiver"}</button><label className="flex items-center gap-1 text-xs text-zinc-500">Stock <input className="input !w-20" type="number" min="0" max="100000" defaultValue={p.stock_quantity} onBlur={e=>{const value=Number(e.currentTarget.value);if(Number.isInteger(value)&&value>=0&&value<=100000&&value!==p.stock_quantity) void manageProduct(p.id,"stock",value);}} /></label></div></div>)}</div>}</section>
    <section className="card p-5"><h2 className="text-xl font-bold">Mes demandes d'achat et de vente</h2><p className="mt-1 text-sm text-zinc-400">Les demandes ne sont pas des commandes payées. L'acceptation réserve le stock ; le règlement et l'expédition restent à convenir entre les parties.</p>{ordersForMe.length===0?<p className="mt-3 text-sm text-zinc-500">Aucune demande pour le moment.</p>:<div className="mt-3 divide-y divide-zinc-800">{ordersForMe.map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{o.title}</p><p className="text-xs text-zinc-500">{o.buyer_id===o.seller_id?"":"Avec "}{o.other_party} · {o.quantity} × {money(o.unit_price_minor,o.currency)} · livraison {o.shipping_country}</p><p className="mt-1 text-xs">Statut : <span className="font-semibold">{o.status}</span></p></div><div className="flex flex-wrap gap-2">{o.seller_id===currentUserId && o.status==="requested" && <><button className="btn-secondary btn-sm" disabled={orderBusy===o.id} onClick={()=>void actOrder(o.id,"accept")}>Accepter</button><button className="btn-secondary btn-sm" disabled={orderBusy===o.id} onClick={()=>void actOrder(o.id,"decline")}>Refuser</button></>}{(o.buyer_id===currentUserId || o.seller_id===currentUserId) && ["requested","accepted"].includes(o.status)&&<button className="btn-secondary btn-sm" disabled={orderBusy===o.id} onClick={()=>void actOrder(o.id,"cancel")}>Annuler / libérer le stock</button>}</div></div>)}</div>}</section>
    <p className="text-xs text-zinc-500">Internationalisation, paiements transfrontaliers, frais de plateforme, taxes, douanes, retours et intégration transporteur doivent être finalisés avant un lancement commercial. Ne partage pas de coordonnées bancaires ou de données sensibles dans les messages de commande.</p>
  </div>;
}
