import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import type { User, Conversation, Message, MessageType, ContactRequest } from "@/types"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Cliente Supabase para o app de chat.
 *
 * Preencha as variáveis abaixo no arquivo `.env` (ou em app.json > expo.extra):
 *   EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
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

console.log("[supabase] URL:", supabaseUrl)
console.log("[supabase] KEY:", supabaseAnonKey?.slice(0, 20) + "...")

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ---------------------------------------------------------------------------
// Mapeadores: convertem linhas (snake_case) do Supabase para os tipos do app.
// ---------------------------------------------------------------------------

function mapUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    avatarUrl: row.avatar_url ?? null,
  }
}

function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    participants: row.participants ?? [],
    lastMessage: row.last_message ?? "",
    lastMessageAt: row.last_message_at ?? null,
  }
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type as MessageType,
    content: row.content,
    fileName: row.file_name ?? null,
    createdAt: row.created_at ?? null,
  }
}

function mapContactRequest(row: any): ContactRequest {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    status: row.status,
    createdAt: row.created_at ?? null,
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === "granted"
}

export async function notifyIncomingMessage(senderName: string, preview: string): Promise<void> {
  const permission = await Notifications.getPermissionsAsync()
  if (permission.status !== "granted") return
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Nova mensagem de ${senderName}`,
      body: preview,
      sound: true,
    },
    trigger: null,
  })
}

// --- Usuários ---

export async function findUserByCredentials(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  if (data.password !== password) return null
  return mapUser(data)
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*")
  if (error) throw error
  return (data ?? []).map(mapUser)
}

export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle()
  if (error) throw error
  return data ? mapUser(data) : null
}

export async function searchUsers(currentUserId: string, query: string): Promise<User[]> {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const { data, error } = await supabase.from("users").select("*").neq("id", currentUserId)
  if (error) throw error

  return (data ?? [])
    .map(mapUser)
    .filter((user) => {
      const haystack = `${user.username} ${user.name}`.toLowerCase()
      return haystack.includes(normalized)
    })
}

export async function getContacts(userId: string): Promise<User[]> {
  const { data, error } = await supabase.from("contact_requests").select("*")
  if (error) throw error

  const contactIds = new Set<string>()
  for (const row of data ?? []) {
    if (row.status !== "accepted") continue
    if (row.sender_id === userId) contactIds.add(row.recipient_id)
    if (row.recipient_id === userId) contactIds.add(row.sender_id)
  }

  if (!contactIds.size) return []

  const { data: users, error: usersError } = await supabase.from("users").select("*").in("id", [...contactIds])
  if (usersError) throw usersError
  return (users ?? []).map(mapUser)
}

export async function getPendingRequests(userId: string): Promise<ContactRequest[]> {
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*")
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapContactRequest)
}

export async function sendContactRequest(senderId: string, recipientId: string): Promise<void> {
  const { data, error: lookupError } = await supabase
    .from("contact_requests")
    .select("*")
    .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId}))`)
    .limit(1)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (data) {
    if (data.status === "accepted") return
    throw new Error("Já existe uma solicitação para este contato")
  }

  const { error } = await supabase.from("contact_requests").insert({
    sender_id: senderId,
    recipient_id: recipientId,
    status: "pending",
    created_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function respondToContactRequest(requestId: string, status: "accepted" | "rejected"): Promise<void> {
  const { error } = await supabase
    .from("contact_requests")
    .update({ status, created_at: new Date().toISOString() })
    .eq("id", requestId)
  if (error) throw error
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", userId)
  if (error) throw error
}

export async function getContactRelationship(userId: string, otherUserId: string): Promise<"none" | "pending" | "accepted" | "incoming"> {
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId}))`)
    .maybeSingle()

  if (error) throw error
  if (!data) return "none"
  if (data.status === "accepted") return "accepted"
  if (data.recipient_id === userId) return "incoming"
  return "pending"
}

// --- Conversas ---

function conversationKey(a: string, b: string): string {
  return [a, b].sort().join("_")
}

export async function getOrCreateConversation(userA: string, userB: string): Promise<string> {
  const id = conversationKey(userA, userB)
  const { data } = await supabase.from("conversations").select("id").eq("id", id).maybeSingle()
  if (!data) {
    const { error } = await supabase.from("conversations").insert({
      id,
      participants: [userA, userB].sort(),
      last_message: "",
      last_message_at: new Date().toISOString(),
    })
    if (error) console.log("[v0] Erro ao criar conversa:", error.message)
  }
  return id
}

export function listenConversations(userId: string, callback: (conversations: Conversation[]) => void) {
  const load = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .contains("participants", [userId])
      .order("last_message_at", { ascending: false })
    if (error) {
      console.log("[v0] Erro ao carregar conversas:", error.message)
      return
    }
    callback((data ?? []).map(mapConversation))
  }

  load()

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// --- Mensagens ---

export function listenMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  currentUserId?: string,
) {
  const load = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
    if (error) {
      console.log("[v0] Erro ao carregar mensagens:", error.message)
      return
    }
    const messages = (data ?? []).map(mapMessage)
    callback(messages)

    const lastMessage = messages[messages.length - 1]
    if (currentUserId && lastMessage && lastMessage.senderId !== currentUserId) {
      const sender = await getUser(lastMessage.senderId)
      const preview = lastMessage.type === "text" ? lastMessage.content : "📎 Nova mídia"
      if (sender) await notifyIncomingMessage(sender.name, preview)
    }
  }

  load()

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => load(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  type: MessageType,
  content: string,
  fileName?: string,
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    type,
    content,
    file_name: fileName ?? null,
    created_at: new Date().toISOString(),
  })
  if (error) throw error

  const preview =
    type === "text"
      ? content
      : type === "image"
        ? "📷 Imagem"
        : type === "audio"
          ? "🎤 Áudio"
          : `📎 ${fileName ?? "Documento"}`

  await supabase
    .from("conversations")
    .update({ last_message: preview, last_message_at: new Date().toISOString() })
    .eq("id", conversationId)
}

// --- Storage ---

// Faz upload de um arquivo (a partir de um URI local) para o bucket "chat"
// e retorna a URL pública.
export async function uploadFile(uri: string, path: string, contentType: string): Promise<string> {
  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const { error } = await supabase.storage
    .from("chat")
    .upload(path, arrayBuffer, { contentType, upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from("chat").getPublicUrl(path)
  return data.publicUrl
}

// --- Presença (status online) ---

const ONLINE_THRESHOLD_MS = 30_000

export function startPresence(userId: string): () => void {
  const beat = () => {
    supabase
      .from("presence")
      .upsert({ user_id: userId, online: true, last_active: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.log("[v0] Erro ao atualizar presença:", error.message)
      })
  }

  beat()
  const interval = setInterval(beat, 15_000)

  return () => {
    clearInterval(interval)
    supabase
      .from("presence")
      .upsert({ user_id: userId, online: false, last_active: new Date().toISOString() })
      .then(() => {})
  }
}

export function listenPresence(callback: (onlineIds: Set<string>) => void) {
  const load = async () => {
    const { data, error } = await supabase.from("presence").select("*")
    if (error) {
      console.log("[v0] Erro ao carregar presença:", error.message)
      return
    }
    const now = Date.now()
    const online = new Set<string>()
    for (const row of data ?? []) {
      const last = row.last_active ? new Date(row.last_active).getTime() : 0
      if (row.online && now - last < ONLINE_THRESHOLD_MS) online.add(row.user_id)
    }
    callback(online)
  }

  load()
  const interval = setInterval(load, 10_000)

  const channel = supabase
    .channel("presence-table")
    .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => load())
    .subscribe()

  return () => {
    clearInterval(interval)
    supabase.removeChannel(channel)
  }
}
