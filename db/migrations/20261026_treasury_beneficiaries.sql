-- Wesh Star IA V29 : bénéficiaires enregistrés pour les virements sortants FCFA.
create table if not exists public.treasury_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  name text,
  operator text not null default 'autre' check (operator in ('mtn','moov','autre')),
  phone text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(phone, operator)
);
create index if not exists idx_treasury_beneficiaries_active on public.treasury_beneficiaries(active, created_at desc);
-- Un encaissement (paiement) ne peut être crédité qu'une fois : index déjà existant (uq_treasury_payment_in).
