import { useEffect, useState } from "react"
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { LogOut, Moon, Sun, Camera, Search, UserPlus, Check, X } from "lucide-react-native"
import * as ImagePicker from "expo-image-picker"
import { Avatar } from "@/components/avatar"
import { useAuth } from "@/hooks/use-auth"
import { usePresence } from "@/hooks/use-presence"
import { useTheme } from "@/hooks/use-theme"
import {
  getContacts,
  getPendingRequests,
  getContactRelationship,
  listenConversationStates,
  listenConversations,
  listenUnreadCounts,
  searchUsers,
  sendContactRequest,
  respondToContactRequest,
  updateUserAvatar,
  uploadFile,
} from "@/services/chat"
import { getInitials, formatTime } from "@/lib/format"
import type { User, Conversation, ContactRequest } from "@/types"

const ICON_LIGHT = "rgb(51 65 85)"
const ICON_DARK = "rgb(203 213 213)"

type ContactRelation = "none" | "pending" | "accepted" | "incoming"

export default function ConversationsScreen() {
  const { user, logout, updateUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const onlineIds = usePresence()
  const router = useRouter()
  const [contacts, setContacts] = useState<User[]>([])
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [relationshipMap, setRelationshipMap] = useState<Record<string, ContactRelation>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [conversationStates, setConversationStates] = useState<
    Record<string, { [userId: string]: { isTyping: boolean; isRecording: boolean } }>
  >({})
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const iconColor = theme === "dark" ? ICON_DARK : ICON_LIGHT

  async function refreshLists() {
    if (!user) return
    try {
      const [contactsData, pendingData] = await Promise.all([getContacts(user.id), getPendingRequests(user.id)])
      setContacts(contactsData)
      setRequests(pendingData)
    } catch (err) {
      console.log("[v0] Erro ao carregar contatos:", err)
    }
  }

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        await refreshLists()
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    return listenConversations(user.id, setConversations)
  }, [user])

  useEffect(() => {
    if (!user) return
    return listenUnreadCounts(user.id, setUnreadCounts)
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const ids = conversations.map((conv) => conv.id)
    return listenConversationStates(ids, setConversationStates)
  }, [user?.id, conversations.map((conv) => conv.id).join(",")])

  useEffect(() => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([])
      setRelationshipMap({})
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchUsers(user.id, searchQuery)
        setSearchResults(results)
        const map: Record<string, ContactRelation> = {}
        await Promise.all(
          results.map(async (item) => {
            map[item.id] = await getContactRelationship(user.id, item.id)
          }),
        )
        setRelationshipMap(map)
      } catch (err) {
        console.log("[v0] Erro ao buscar usuários:", err)
      }
    }, 220)
    return () => clearTimeout(timeout)
  }, [user?.id, searchQuery])

  async function handleAvatarPick() {
    if (!user) return
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert("Permissão negada", "É preciso permitir acesso à galeria para trocar a foto de perfil.")
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      const ext = asset.uri.split(".").pop() || "jpg"
      const path = `avatars/${user.id}/${Date.now()}.${ext}`
      const url = await uploadFile(asset.uri, path, asset.mimeType ?? `image/${ext}`)
      await updateUserAvatar(user.id, url)
      await updateUser({ ...user, avatarUrl: url })
    } catch (err) {
      console.log("[v0] Erro ao atualizar foto:", err)
    }
  }

  async function handleSendRequest(recipientId: string) {
    if (!user) return
    try {
      setActionLoadingId(recipientId)
      await sendContactRequest(user.id, recipientId)
      setSearchQuery("")
      await refreshLists()
    } catch (err) {
      Alert.alert("Não foi possível enviar a solicitação", (err as Error).message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleRespondRequest(requestId: string, status: "accepted" | "rejected") {
    try {
      setActionLoadingId(requestId)
      await respondToContactRequest(requestId, status)
      await refreshLists()
    } catch (err) {
      Alert.alert("Não foi possível responder à solicitação", (err as Error).message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const lastByUser = new Map<string, Conversation>()
  for (const conv of conversations) {
    const other = conv.participants.find((p) => p !== user?.id)
    if (other) lastByUser.set(other, conv)
  }

  const sortedContacts = [...contacts].sort((a, b) => {
    const ca = lastByUser.get(a.id)?.lastMessageAt ? Date.parse(lastByUser.get(a.id)!.lastMessageAt!) : 0
    const cb = lastByUser.get(b.id)?.lastMessageAt ? Date.parse(lastByUser.get(b.id)!.lastMessageAt!) : 0
    return cb - ca
  })

  return (
    <SafeAreaView className="flex-1 bg-card" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <View className="flex-1 flex-row items-center gap-3">
          <Pressable onPress={handleAvatarPick} accessibilityLabel="Alterar foto de perfil">
            <Avatar
              initials={user ? getInitials(user.name) : "?"}
              size={36}
              variant="primary"
              imageUrl={user?.avatarUrl}
            />
          </Pressable>
          <Text className="flex-1 font-medium text-card-foreground" numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={toggleTheme}
            accessibilityLabel="Alternar tema"
            className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
          >
            {theme === "dark" ? <Sun size={20} color={iconColor} /> : <Moon size={20} color={iconColor} />}
          </Pressable>
          <Pressable
            onPress={logout}
            accessibilityLabel="Sair"
            className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
          >
            <LogOut size={20} color={iconColor} />
          </Pressable>
        </View>
      </View>

      <View className="border-b border-border bg-card px-4 py-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
          <Search size={18} color={iconColor} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar usuário por nome ou username"
            placeholderTextColor="rgb(148 163 165)"
            className="flex-1 text-sm text-foreground"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="rgb(20 184 166)" />
        </View>
      ) : (
        <FlatList
          data={sortedContacts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View className="px-4 py-3">
              {requests.length > 0 ? (
                <View className="mb-4 rounded-2xl border border-border bg-background p-3">
                  <Text className="mb-2 text-sm font-semibold text-foreground">Solicitações recebidas</Text>
                  {requests.map((request) => (
                    <View key={request.id} className="mb-2 flex-row items-center justify-between gap-2 rounded-xl bg-muted p-2">
                      <Text className="flex-1 text-sm text-foreground">{request.senderId}</Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => handleRespondRequest(request.id, "accepted")}
                          className="h-8 w-8 items-center justify-center rounded-full bg-primary"
                        >
                          {actionLoadingId === request.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Check size={16} color="#fff" />
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => handleRespondRequest(request.id, "rejected")}
                          className="h-8 w-8 items-center justify-center rounded-full bg-destructive"
                        >
                          {actionLoadingId === request.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <X size={16} color="#fff" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {searchQuery.trim() ? (
                <View className="mb-4 rounded-2xl border border-border bg-background p-3">
                  <Text className="mb-2 text-sm font-semibold text-foreground">Resultados da busca</Text>
                  {searchResults.length ? (
                    searchResults.map((result) => {
                      const relation = relationshipMap[result.id] ?? "none"
                      return (
                        <View key={result.id} className="mb-2 flex-row items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                          <View className="flex-1 flex-row items-center gap-2">
                            <Avatar initials={getInitials(result.name)} size={36} imageUrl={result.avatarUrl} />
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-foreground">{result.name}</Text>
                              <Text className="text-xs text-muted-foreground">@{result.username}</Text>
                            </View>
                          </View>
                          {relation === "accepted" ? (
                            <Text className="text-xs text-muted-foreground">Contato</Text>
                          ) : relation === "incoming" ? (
                            <Text className="text-xs text-muted-foreground">Solicitação recebida</Text>
                          ) : relation === "pending" ? (
                            <Text className="text-xs text-muted-foreground">Pendente</Text>
                          ) : (
                            <Pressable
                              onPress={() => handleSendRequest(result.id)}
                              className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5"
                            >
                              {actionLoadingId === result.id ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <UserPlus size={14} color="#fff" />
                              )}
                              <Text className="text-xs font-semibold text-primary-foreground">Adicionar</Text>
                            </Pressable>
                          )}
                        </View>
                      )
                    })
                  ) : (
                    <Text className="text-sm text-muted-foreground">Nenhum usuário encontrado.</Text>
                  )}
                </View>
              ) : null}

              <Text className="mb-2 text-sm font-semibold text-foreground">Meus contatos</Text>
            </View>
          }
          ListEmptyComponent={
            <Text className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum contato ainda. Busque por usuários para começar.
            </Text>
          }
          renderItem={({ item: contact }) => {
            const conv = lastByUser.get(contact.id)
            return (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/chat/[contactId]", params: { contactId: contact.id } })
                }
                className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
              >
                <Avatar
                  initials={getInitials(contact.name)}
                  size={48}
                  online={onlineIds.has(contact.id)}
                  imageUrl={contact.avatarUrl}
                />
                <View className="flex-1 border-b border-border pb-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-medium text-card-foreground" numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {conv?.lastMessageAt ? (
                        <Text className="text-xs text-muted-foreground">{formatTime(conv.lastMessageAt)}</Text>
                      ) : null}
                      {conv?.id && unreadCounts[conv.id] ? (
                        <View className="rounded-full bg-destructive px-2 py-0.5">
                          <Text className="text-[11px] font-semibold text-white">
                            {unreadCounts[conv.id]}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    className={
                      conv &&
                      conversationStates[conv.id] &&
                      Object.values(conversationStates[conv.id]).some((state) => state.isTyping || state.isRecording)
                        ? "text-sm text-primary"
                        : "text-sm text-muted-foreground"
                    }
                    numberOfLines={1}
                  >
                    {(() => {
                      if (!conv) return "Toque para conversar"
                      const state = conversationStates[conv.id]
                      if (state) {
                        const otherUser = Object.keys(state).find((otherId) => otherId !== user?.id)
                        const otherState = otherUser ? state[otherUser] : undefined
                        if (otherState?.isRecording) return "Gravando áudio..."
                        if (otherState?.isTyping) return "Digitando..."
                      }
                      return conv.lastMessage || "Toque para conversar"
                    })()}
                  </Text>
                </View>
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}
