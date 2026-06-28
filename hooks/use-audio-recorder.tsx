import { useRef, useState } from "react"
import { Audio } from "expo-av"

export interface AudioResult {
  uri: string
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)

  async function start() {
    try {
      const permission = await Audio.requestPermissionsAsync()
      if (!permission.granted) {
        console.log("[v0] Permissão de microfone negada")
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      )
      recordingRef.current = recording
      setIsRecording(true)
    } catch (err) {
      console.log("[v0] Erro ao iniciar gravação:", err)
      setIsRecording(false)
    }
  }

  async function stop(): Promise<AudioResult | null> {
    const recording = recordingRef.current
    if (!recording) return null
    try {
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = recording.getURI()
      recordingRef.current = null
      setIsRecording(false)
      return uri ? { uri } : null
    } catch (err) {
      console.log("[v0] Erro ao parar gravação:", err)
      setIsRecording(false)
      return null
    }
  }

  async function cancel() {
    const recording = recordingRef.current
    if (recording) {
      try {
        await recording.stopAndUnloadAsync()
      } catch {
        // ignore
      }
      recordingRef.current = null
    }
    setIsRecording(false)
  }

  return { isRecording, start, stop, cancel }
}
