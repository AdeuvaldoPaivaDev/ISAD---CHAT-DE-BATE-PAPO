import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { AppState } from "react-native"
import { useAuth } from "@/hooks/use-auth"
import { startPresence, listenPresence } from "@/services/chat"

const PresenceContext = createContext<Set<string>>(new Set())

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    let stopPresence = startPresence(user.id)
    const unsubscribe = listenPresence(setOnlineIds)

    // Reinicia o "heartbeat" quando o app volta ao primeiro plano.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        stopPresence()
        stopPresence = startPresence(user.id)
      }
    })

    return () => {
      sub.remove()
      stopPresence()
      unsubscribe()
    }
  }, [user])

  return <PresenceContext.Provider value={onlineIds}>{children}</PresenceContext.Provider>
}

export function usePresence() {
  return useContext(PresenceContext)
}

export function useIsOnline(userId: string | undefined | null) {
  const onlineIds = useContext(PresenceContext)
  return userId ? onlineIds.has(userId) : false
}
