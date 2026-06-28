import "../global.css"
import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { ThemeProvider, useTheme } from "@/hooks/use-theme"
import { PresenceProvider } from "@/hooks/use-presence"
import { requestNotificationPermission } from "@/services/chat"

function RootNavigator() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === "login"
    if (!user && !inAuthGroup) {
      router.replace("/login")
    } else if (user && inAuthGroup) {
      router.replace("/")
    }
  }, [user, loading, segments])

  useEffect(() => {
    if (!user) return
    requestNotificationPermission().catch(() => {})
  }, [user?.id])

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="chat/[contactId]" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <PresenceProvider>
              <RootNavigator />
            </PresenceProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
