import { useEffect, useRef, useState } from "react"
import { View, Text, Pressable } from "react-native"
import { Audio, type AVPlaybackStatus } from "expo-av"
import { Play, Pause } from "lucide-react-native"

interface AudioPlayerProps {
  uri: string
  // Cores para combinar com o balão (enviado x recebido).
  tint: string
  track: string
}

function formatDuration(ms: number): string {
  if (!ms || Number.isNaN(ms)) return "0:00"
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({ uri, tint, track }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync()
      soundRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!soundRef.current) return
    soundRef.current.setRateAsync(playbackRate, true).catch(() => {})
  }, [playbackRate])

  function onStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return
    setPosition(status.positionMillis ?? 0)
    setDuration(status.durationMillis ?? 0)
    setIsPlaying(status.isPlaying)
    if (status.didJustFinish) {
      setIsPlaying(false)
      setPosition(0)
      soundRef.current?.stopAsync().catch(() => {})
      soundRef.current?.setPositionAsync(0).catch(() => {})
    }
  }

  async function toggle() {
    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, rate: playbackRate },
          onStatus,
        )
        soundRef.current = sound
        return
      }
      if (isPlaying) {
        await soundRef.current.pauseAsync()
      } else {
        await soundRef.current.playAsync()
      }
    } catch (err) {
      console.log("[v0] Erro ao reproduzir áudio:", err)
    }
  }

  function cycleRate() {
    const rates = [1, 1.5, 2]
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    setPlaybackRate(rates[nextIndex])
  }

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0

  return (
    <View className="gap-2" style={{ minWidth: 220 }}>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggle}
          accessibilityLabel={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: tint }}
        >
          {isPlaying ? <Pause size={18} color={track} /> : <Play size={18} color={track} />}
        </Pressable>
        <View className="flex-1 gap-1">
          <View className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: track }}>
            <View
              style={{ width: `${progress * 100}%`, backgroundColor: tint }}
              className="h-full rounded-full"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text style={{ color: tint, fontSize: 11 }}>
              {formatDuration(position)} / {formatDuration(duration)}
            </Text>
            <Pressable
              onPress={cycleRate}
              accessibilityLabel={`Mudar velocidade para ${playbackRate === 2 ? "1x" : `${playbackRate + 0.5}x`}`}
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: track }}
            >
              <Text style={{ color: tint, fontSize: 12, fontWeight: "600" }}>{playbackRate}x</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}
