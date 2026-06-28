import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { MessageCircle } from "lucide-react-native"
import { useAuth } from "@/hooks/use-auth"
import { findUserByCredentials } from "@/services/chat"
import { isSupabaseConfigured } from "@/lib/supabase"

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError("")
    if (!username.trim() || !password) {
      setError("Preencha usuário e senha.")
      return
    }
    setLoading(true)
    try {
      const user = await findUserByCredentials(username.trim(), password)
      if (!user) {
        setError("Usuário ou senha inválidos.")
        return
      }
      await login(user)
    } catch (err) {
      console.log("[v0] Erro no login:", err)
      setError(`Erro ao conectar: ${(err as Error)?.message ?? "desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
          <View className="mb-8 items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
              <MessageCircle size={28} color="#fff" />
            </View>
            <View className="items-center">
              <Text className="text-xl font-semibold text-card-foreground">Entrar no Chat</Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Use as credenciais fornecidas pelo administrador.
              </Text>
            </View>
          </View>

          {!isSupabaseConfigured && (
            <View className="mb-4 rounded-lg border border-border bg-muted p-3">
              <Text className="text-xs text-muted-foreground">
                Supabase ainda não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e
                EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.
              </Text>
            </View>
          )}

          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-card-foreground">Usuário</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="seu_usuario"
                placeholderTextColor="rgb(148 163 165)"
                className="rounded-lg border border-border bg-background px-3 py-3 text-foreground"
              />
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-card-foreground">Senha</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="rgb(148 163 165)"
                className="rounded-lg border border-border bg-background px-3 py-3 text-foreground"
              />
            </View>

            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-2 h-12 flex-row items-center justify-center rounded-lg bg-primary active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-primary-foreground">Entrar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
