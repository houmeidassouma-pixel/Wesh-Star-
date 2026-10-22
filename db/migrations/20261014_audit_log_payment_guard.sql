-- V8: journal d'audit des opérations sensibles + garde anti double-crédit des paiements.
-- Idempotent : peut être rejoué sans effet de bord.
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);
create index if not exists idx_audit_log_action on public.audit_log(action);
create index if not exists idx_audit_log_actor on public.audit_log(actor_id);

-- Date à laquelle un paiement a réellement été crédité (minutes/abonnement). Non nulle = ne plus jamais re-créditer.
alter table public.payment_requests add column if not exists fulfilled_at timestamptz;
update public.payment_requests set fulfilled_at = coalesce(reviewed_at, now())
  where status = 'confirmed' and fulfilled_at is null;
