import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import Constants from "expo-constants"

/**
 * Cliente Supabase para o app de chat.
 *
 * Preencha as variáveis abaixo no arquivo `.env` (ou em app.json > expo.extra):
 *   EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
 *
 * --- Schema esperado no Supabase (SQL) ---
 *
 * create table public.users (
 *   id uuid primary key default gen_random_uuid(),
 *   username text unique not null,
 *   password text not null,
 *   name text not null
 * );
 *
 * create table public.conversations (
 *   id text primary key,
 *   participants text[] not null,
 *   last_message text default '',
 *   last_message_at timestamptz default now()
 * );
 *
 * create table public.messages (
 *   id uuid primary key default gen_random_uuid(),
 *   conversation_id text not null references public.conversations(id),
 *   sender_id text not null,
 *   type text not null check (type in ('text','image','audio','document')),
 *   content text not null,
 *   file_name text,
 *   created_at timestamptz default now()
 * );
 *
 * create table public.presence (
 *   user_id text primary key,
 *   online boolean default false,
 *   last_active timestamptz default now()
 * );
 *
 * -- Storage: crie um bucket público chamado "chat".
 * -- Realtime: habilite replicação para messages, conversations e presence.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "https://YOUR_PROJECT.supabase.co"
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "YOUR_ANON_KEY"

export const isSupabaseConfigured =
  !supabaseUrl.includes("YOUR_PROJECT") && !supabaseAnonKey.includes("YOUR_ANON_KEY")

console.log('[supabase] URL:', supabaseUrl)
console.log('[supabase] KEY:', supabaseAnonKey?.slice(0, 20) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
