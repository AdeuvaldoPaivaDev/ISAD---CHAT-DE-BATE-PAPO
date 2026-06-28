import { useEffect, useState } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, Modal } from "react-native"
import { Send, ImageIcon, Paperclip, Mic, Trash2 } from "lucide-react-native"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"

interface ChatInputProps {
  onSendText: (text: string) => void
  onAttachImage: () => void
  onAttachDocument: () => void
  onSendAudio: (uri: string) => void
  onTypingChange?: (isTyping: boolean) => void
  onRecordingChange?: (isRecording: boolean) => void
  sending: boolean
  iconColor: string
}

export function ChatInput({
  onSendText,
  onAttachImage,
  onAttachDocument,
  onSendAudio,
  onTypingChange,
  onRecordingChange,
  sending,
  iconColor,
}: ChatInputProps) {
  const [text, setText] = useState("")
  const [emojiOpen, setEmojiOpen] = useState(false)
  const { isRecording, start, stop, cancel } = useAudioRecorder()

  useEffect(() => {
    onRecordingChange?.(isRecording)
  }, [isRecording, onRecordingChange])

  function updateText(value: string) {
    setText(value)
    onTypingChange?.(value.trim().length > 0)
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSendText(trimmed)
    setText("")
    onTypingChange?.(false)
  }

  async function handleStopRecording() {
    const result = await stop()
    onRecordingChange?.(false)
    if (result?.uri) onSendAudio(result.uri)
  }

  function addEmoji(emoji: string) {
    setText((prev) => prev + emoji)
    setEmojiOpen(false)
    onTypingChange?.(true)
  }

  if (isRecording) {
    return (
      <View className="flex-row items-center gap-3 border-t border-border bg-card px-4 py-3">
        <View className="h-2.5 w-2.5 rounded-full bg-destructive" />
        <Text className="flex-1 text-sm text-card-foreground">Gravando áudio...</Text>
        <Pressable
          onPress={cancel}
          accessibilityLabel="Cancelar gravação"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
        >
          <Trash2 size={22} color={iconColor} />
        </Pressable>
        <Pressable
          onPress={handleStopRecording}
          accessibilityLabel="Enviar gravação"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Send size={20} color="#fff" />
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-row items-end gap-2 border-t border-border bg-card px-3 py-2">
      <Pressable
        onPress={onAttachImage}
        disabled={sending}
        accessibilityLabel="Enviar imagem"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
      >
        <ImageIcon size={22} color={iconColor} />
      </Pressable>
      <Pressable
        onPress={onAttachDocument}
        disabled={sending}
        accessibilityLabel="Enviar documento"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
      >
        <Paperclip size={22} color={iconColor} />
      </Pressable>

      <Pressable
        onPress={() => setEmojiOpen(true)}
        accessibilityLabel="Adicionar emoji"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-accent"
      >
        <Text className="text-xl">😊</Text>
      </Pressable>

      <TextInput
        value={text}
        onChangeText={updateText}
        placeholder="Mensagem"
        placeholderTextColor="rgb(148 163 165)"
        multiline
        className="max-h-28 flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-foreground"
      />

      {sending ? (
        <View className="h-10 w-10 items-center justify-center">
          <ActivityIndicator color="rgb(20 184 166)" />
        </View>
      ) : text.trim() ? (
        <Pressable
          onPress={handleSend}
          accessibilityLabel="Enviar mensagem"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Send size={20} color="#fff" />
        </Pressable>
      ) : (
        <Pressable
          onPress={async () => {
            await start()
            onRecordingChange?.(true)
          }}
          accessibilityLabel="Gravar áudio"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Mic size={20} color="#fff" />
        </Pressable>
      )}
      <Modal visible={emojiOpen} transparent animationType="fade" onRequestClose={() => setEmojiOpen(false)}>
        <Pressable className="flex-1 items-center justify-end bg-black/40" onPress={() => setEmojiOpen(false)}>
          <View className="w-full rounded-t-3xl border border-border bg-card p-4">
            <Text className="mb-3 text-sm font-semibold text-card-foreground">Escolha um emoji</Text>
            <View className="flex-row flex-wrap gap-2">
              {['😊','😂','😍','🥰','😎','👍','🙏','🎉','❤️','🔥','👏','😄'].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => addEmoji(emoji)}
                  className="h-11 w-11 items-center justify-center rounded-xl bg-muted"
                >
                  <Text className="text-2xl">{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
