import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import type { ScriptVersion } from "../types"

interface UseVoiceGenerationProps {
  projectId: string
  finalScript: string
  selectedVoice: string
  activeVersion: ScriptVersion | undefined
  onAudioGenerated: (audioUrl: string) => void
}

interface UseVoiceGenerationReturn {
  audioData: string | null
  isPlaying: boolean
  previewingVoice: string | null
  generateMutation: any // UseMutationResult with specific types
  audioRef: React.RefObject<HTMLAudioElement | null>
  handleGenerate: () => void
  handlePlayPause: () => void
  handlePreview: (voiceId: string, previewUrl?: string) => void
  handleDownload: (serverAudioUrl: string | null) => void
  setIsPlaying: (playing: boolean) => void
}

export function useVoiceGeneration({
  projectId,
  finalScript,
  selectedVoice,
  activeVersion,
  onAudioGenerated,
}: UseVoiceGenerationProps): UseVoiceGenerationReturn {
  const { toast } = useToast()
  const [audioData, setAudioData] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/elevenlabs/generate", {
        voiceId: selectedVoice,
        text: finalScript,
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      })
      return await res.json()
    },
    onSuccess: async (data) => {
      setAudioData(data.audio)
      setIsPlaying(false)

      try {
        const base64Data = data.audio
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'audio/mpeg' })

        const fileName = `voice-${selectedVoice}-${Date.now()}.mp3`
        const file = new File([blob], fileName, { type: 'audio/mpeg' })

        const formData = new FormData()
        formData.append('audio', file)
        formData.append('projectId', projectId)

        const uploadRes = await fetch('/api/audio/upload', {
          method: 'POST',
          credentials: 'include', // Sends httpOnly cookie automatically
          body: formData,
        })

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text()
          throw new Error(`Failed to upload audio file: ${uploadRes.status} ${errorText}`)
        }

        const uploadData = await uploadRes.json()
        onAudioGenerated(uploadData.audioUrl)

        // Auto-save to database
        const stepDataToSave = {
          mode: "generate",
          finalScript,
          selectedVoice,
          audioUrl: uploadData.audioUrl,
          versionId: activeVersion?.id,
        }

        await apiRequest("POST", `/api/projects/${projectId}/steps`, {
          stepNumber: 4,
          data: stepDataToSave
        })

        await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "steps", 4] })

        toast({
          title: "Audio saved",
          description: "Audio has been generated and saved automatically",
        })
      } catch (error) {
        console.error('Error uploading audio:', error)
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Audio generated but failed to save file. You can still download it.",
        })
      }
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handlePreview = (voiceId: string, previewUrl?: string) => {
    if (!previewUrl) return

    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }

    if (previewingVoice === voiceId && previewAudioRef.current) {
      previewAudioRef.current.pause()
      setPreviewingVoice(null)
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }

      const audio = new Audio(previewUrl)
      previewAudioRef.current = audio
      audio.play()
      setPreviewingVoice(voiceId)
      audio.onended = () => setPreviewingVoice(null)
    }
  }

  const handleDownload = (serverAudioUrl: string | null) => {
    if (serverAudioUrl) {
      const a = document.createElement('a')
      a.href = serverAudioUrl
      a.download = `voiceover-${Date.now()}.mp3`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }

    if (!audioData) return

    const blob = new Blob(
      [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
      { type: 'audio/mpeg' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voiceover-${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    audioData,
    isPlaying,
    previewingVoice,
    generateMutation,
    audioRef,
    handleGenerate,
    handlePlayPause,
    handlePreview,
    handleDownload,
    setIsPlaying,
  }
}
