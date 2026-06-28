-- =============================================================
-- Setup do banco para o app de chat (Expo + Supabase)
-- Cole este script inteiro no SQL Editor do Supabase e rode.
-- =============================================================

-- 1) Tabelas -------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  name text not null,
  avatar_url text
);

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id text primary key,
  participants text[] not null,
  last_message text default '',
  last_message_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  type text not null check (type in ('text','image','audio','document')),
  content text not null,
  file_name text,
  created_at timestamptz default now()
);

create table if not exists public.presence (
  user_id text primary key,
  online boolean default false,
  last_active timestamptz default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- 2) Realtime ------------------------------------------------
-- Habilita replicação em tempo real para as tabelas usadas pelo app.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.presence;
alter publication supabase_realtime add table public.contact_requests;

-- 3) Storage -------------------------------------------------
-- Cria um bucket público chamado "chat" para imagens/áudio/documentos.

insert into storage.buckets (id, name, public)
values ('chat', 'chat', true)
on conflict (id) do nothing;

-- Permite leitura/escrita pública no bucket "chat".
drop policy if exists "chat public read" on storage.objects;
create policy "chat public read"
  on storage.objects for select
  using (bucket_id = 'chat');

drop policy if exists "chat public write" on storage.objects;
create policy "chat public write"
  on storage.objects for insert
  with check (bucket_id = 'chat');

-- 4) Usuários de teste --------------------------------------
-- O login lê usuário/senha desta tabela (protótipo, senha em texto puro).
-- Troque os valores abaixo pelos seus.

insert into public.users (username, password, name) values
  ('usuário', 'senha aqui', 'Nome da pessoa')
on conflict (username) do nothing;
