-- Wesh Star IA: self-hosted private messaging and WebRTC call signaling.
-- Audio/video media is peer-to-peer when possible; TURN relay may be needed.
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists idx_private_messages_pair_time
  on public.private_messages (sender_id, recipient_id, created_at desc);
create index if not exists idx_private_messages_recipient_time
  on public.private_messages (recipient_id, created_at desc);

create table if not exists public.communication_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','ended','declined','missed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  check (caller_id <> callee_id)
);
create index if not exists idx_communication_calls_callee_status
  on public.communication_calls (callee_id, status, created_at desc);
create index if not exists idx_communication_calls_caller_status
  on public.communication_calls (caller_id, status, created_at desc);

-- Only transient signaling metadata (SDP/ICE) is stored, not call recordings.
create table if not exists public.call_signals (
  id bigserial primary key,
  call_id uuid not null references public.communication_calls(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice-candidate','accepted','declined','ended')),
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_call_signals_call_id_id on public.call_signals (call_id, id);
