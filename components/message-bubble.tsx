import { useState } from "react"
import { View, Text, Pressable, Image, Linking, Modal } from "react-native"
import { Check, FileText, X } from "lucide-react-native"
import { AudioPlayer } from "@/components/audio-player"
import { formatTime } from "@/lib/format"
import type { Message } from "@/types"

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  theme: "light" | "dark"
}

export function MessageBubble({ message, isMine, theme }: MessageBubbleProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  // Cores usadas pelo player de áudio para contrastar com o balão.
  const audioTint = isMine
    ? "rgb(255 255 255)"
    : theme === "dark"
      ? "rgb(20 184 166)"
      : "rgb(13 148 136)"
  const audioTrack = isMine ? "rgba(255,255,255,0.3)" : "rgba(100,116,139,0.3)"

  const bubbleClass = isMine
    ? "bg-slate-700 rounded-2xl rounded-br-md"
    : "bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md"
  const textClass = isMine ? "text-white" : "text-slate-100"
  const timeClass = isMine ? "text-slate-200" : "text-slate-400"

  function renderContent() {
    switch (message.type) {
      case "image":
        return (
          <>
            <Pressable onPress={() => setPreviewOpen(true)} accessibilityLabel="Abrir imagem">
              <Image
                source={{ uri: message.content }}
                style={{ width: 200, height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
            </Pressable>
            <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
              <View className="flex-1 items-center justify-center bg-black/90">
                <Pressable
                  onPress={() => setPreviewOpen(false)}
                  accessibilityLabel="Fechar imagem"
                  className="absolute right-5 top-12 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/20"
                >
                  <X size={22} color="#fff" />
                </Pressable>
                <Image
                  source={{ uri: message.content }}
                  style={{ width: "92%", height: "70%" }}
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </>
        )
      case "audio":
        return <AudioPlayer uri={message.content} tint={audioTint} track={audioTrack} />
      case "document":
        return (
          <Pressable
            onPress={() => Linking.openURL(message.content)}
            accessibilityLabel={`Abrir documento ${message.fileName ?? ""}`}
            className="flex-row items-center gap-3"
            style={{ minWidth: 180 }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "rgba(100,116,139,0.15)" }}
            >
              <FileText size={20} color={audioTint} />
            </View>
            <Text className={`flex-1 text-sm font-medium ${textClass}`} numberOfLines={2}>
              {message.fileName ?? "Documento"}
            </Text>
          </Pressable>
        )
      default:
        return <Text className={`text-base ${textClass}`}>{message.content}</Text>
    }
  }

  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? "self-end" : "self-start"}`}>
      <View className={`px-3 py-2 ${bubbleClass}`}>
        {renderContent()}
        <View className="mt-1 flex-row items-center justify-between">
          <Text className={`text-[11px] ${timeClass}`}>{formatTime(message.createdAt)}</Text>
          {isMine ? (
            <View className="flex-row items-center gap-0.5">
              <Check size={12} color={message.status === "read" ? "#38bdf8" : "#94a3b8"} />
              {message.status !== "sent" ? (
                <Check size={12} color={message.status === "read" ? "#38bdf8" : "#94a3b8"} />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
