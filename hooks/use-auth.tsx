import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { User } from "@/types"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => Promise<void>
}

const STORAGE_KEY = "chat_session"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setUser(JSON.parse(stored) as User)
          } catch {
            AsyncStorage.removeItem(STORAGE_KEY)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function updateUser(u: User) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }

  async function login(u: User) {
    await updateUser(u)
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}
