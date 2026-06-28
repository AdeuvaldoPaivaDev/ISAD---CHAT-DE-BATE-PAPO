import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Appearance } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { colorScheme as nwColorScheme } from "nativewind"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const STORAGE_KEY = "chat_theme"

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  function applyTheme(next: Theme) {
    setTheme(next)
    nwColorScheme.set(next)
  }

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const initial =
        (stored as Theme | null) ?? (Appearance.getColorScheme() === "dark" ? "dark" : "light")
      applyTheme(initial)
    })
  }, [])

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      AsyncStorage.setItem(STORAGE_KEY, next)
      nwColorScheme.set(next)
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return ctx
}
