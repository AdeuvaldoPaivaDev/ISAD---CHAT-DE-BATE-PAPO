export interface User {
  id: string
  username: string
  // Mantido para compatibilidade com o login por credenciais.
  password?: string
  name: string
  avatarUrl?: string | null
}

export interface Conversation {
  id: string
  participants: string[]
  lastMessage: string
  // ISO string (timestamptz do Supabase) em vez do Timestamp do Firestore.
  lastMessageAt: string | null
}

export interface ContactRequest {
  id: string
  senderId: string
  recipientId: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string | null
}

export type MessageType = "text" | "image" | "audio" | "document"

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  // Nome original do arquivo (usado para documentos).
  fileName?: string | null
  createdAt: string | null
  read?: boolean
  readAt?: string | null
}
