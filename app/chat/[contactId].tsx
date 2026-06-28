import { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { Avatar } from "@/components/avatar"
import { MessageBubble } from "@/components/message-bubble"
import { ChatInput } from "@/components/chat-input"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/hooks/use-theme"
import { useIsOnline } from "@/hooks/use-presence"
import {
  getUser,
  getContactRelationship,
  getOrCreateConversation,
  listenMessages,
  sendMessage,
  uploadFile,
} from "@/services/chat"
import { getInitials } from "@/lib/format"
import type { User, Message } from "@/types"

const ICON_LIGHT = "rgb(51 65 85)"
const ICON_DARK = "rgb(203 213 213)"

function extFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri)
  return match ? match[1].toLowerCase() : "bin"
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ contactId?: string | string[] }>()
  const contactId = Array.isArray(params.contactId) ? params.contactId[0] : params.contactId
  const { user } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const listRef = useRef<FlatList<Message>>(null)

  const [contact, setContact] = useState<User | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const isOnline = useIsOnline(contactId)
  const iconColor = theme === "dark" ? ICON_DARK : ICON_LIGHT

  // Carrega contato + cria/recupera a conversa.
  useEffect(() => {
    if (!user || !contactId) return
    let active = true
    ;(async () => {
      try {
        const relation = await getContactRelationship(user.id, contactId)
        if (relation !== "accepted") {
          router.back()
          return
        }
        const [contactData, convId] = await Promise.all([
          getUser(contactId),
          getOrCreateConversation(user.id, contactId),
        ])
        if (!active) return
        setContact(contactData)
        setConversationId(convId)
      } catch (err) {
        console.log("[v0] Erro ao iniciar conversa:", err)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user?.id, contactId])

  // Escuta as mensagens em tempo real.
  useEffect(() => {
    if (!conversationId || !user) return
    return listenMessages(conversationId, setMessages, user.id)
  }, [conversationId, user?.id])

  // Rola para o final quando chegam novas mensagens.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    }
  }, [messages.length])

  async function handleSendText(text: string) {
    if (!conversationId || !user) return
    try {
      await sendMessage(conversationId, user.id, "text", text)
    } catch (err) {
      console.log("[v0] Erro ao enviar texto:", err)
    }
  }

  async function handleAttachImage() {
    if (!conversationId || !user) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        console.log("[v0] Permissão de galeria negada")
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      })
      if (result.canceled || !result.assets?.[0]) return

      setSending(true)
      const asset = result.assets[0]
      const ext = extFromUri(asset.uri) || "jpg"
      const path = `${conversationId}/${Date.now()}.${ext}`
      const url = await uploadFile(asset.uri, path, asset.mimeType ?? `image/${ext}`)
      await sendMessage(conversationId, user.id, "image", url)
    } catch (err) {
      console.log("[v0] Erro ao enviar imagem:", err)
    } finally {
      setSending(false)
    }
  }

  async function handleAttachDocument() {
    if (!conversationId || !user) return
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.[0]) return

      setSending(true)
      const asset = result.assets[0]
      const ext = extFromUri(asset.name || asset.uri) || "bin"
      const path = `${conversationId}/${Date.now()}-${asset.name ?? `arquivo.${ext}`}`
      const url = await uploadFile(asset.uri, path, asset.mimeType ?? "application/octet-stream")
      await sendMessage(conversationId, user.id, "document", url, asset.name ?? `arquivo.${ext}`)
    } catch (err) {
      console.log("[v0] Erro ao enviar documento:", err)
    } finally {
      setSending(false)
    }
  }

  async function handleSendAudio(uri: string) {
    if (!conversationId || !user) return
    try {
      setSending(true)
      const ext = extFromUri(uri) || "m4a"
      const path = `${conversationId}/${Date.now()}.${ext}`
      const url = await uploadFile(uri, path, `audio/${ext === "caf" ? "x-caf" : ext}`)
      await sendMessage(conversationId, user.id, "audio", url)
    } catch (err) {
      console.log("[v0] Erro ao enviar áudio:", err)
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* Cabeçalho */}
      <View className="flex-row items-center gap-2 border-b border-border bg-card px-2 py-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
        >
          <ChevronLeft size={24} color={iconColor} />
        </Pressable>
        <Avatar
          initials={contact ? getInitials(contact.name) : "?"}
          size={40}
          online={isOnline}
          imageUrl={contact?.avatarUrl}
        />
        <View className="flex-1">
          <Text className="font-semibold text-card-foreground" numberOfLines={1}>
            {contact?.name ?? "Conversa"}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="rgb(20 184 166)" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center">
                <Text className="text-center text-sm text-muted-foreground">
                  Nenhuma mensagem ainda.{"\n"}Diga olá!
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} isMine={item.senderId === user?.id} theme={theme} />
            )}
          />
        )}

        <ChatInput
          onSendText={handleSendText}
          onAttachImage={handleAttachImage}
          onAttachDocument={handleAttachDocument}
          onSendAudio={handleSendAudio}
          sending={sending}
          iconColor={iconColor}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
