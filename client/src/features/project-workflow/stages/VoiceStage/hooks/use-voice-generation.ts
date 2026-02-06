import { useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/shared/hooks/use-toast"
import { useStageData } from "../../../hooks/useStageData"
import type { UseVoiceGenerationProps, UseVoiceGenerationReturn } from "../types"

export function useVoiceGeneration({
  finalScript,
  selectedVoice,
  activeVersion,
  onAudioGenerated,
}: UseVoiceGenerationProps): UseVoiceGenerationReturn {
  const { project } = useStageData()
  const projectId = project.id
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
      // Новый API возвращает audioUrl напрямую, файл уже сохранен на сервере
      if (!data.audioUrl) {
        throw new Error('Не удалось получить URL аудио')
      }

      setAudioData(data.audioUrl)
      setIsPlaying(false)
      onAudioGenerated(data.audioUrl)


      // Auto-save to database
      try {
        const stepDataToSave = {
          mode: "generate",
          finalScript,
          selectedVoice,
          audioUrl: data.audioUrl,
        }

        await apiRequest("POST", `/api/projects/${projectId}/steps`, {
          stepNumber: 4,
          data: stepDataToSave
        })

        await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "steps", 4] })

        toast({
          title: "Аудио сохранено",
          description: "Аудио успешно сгенерировано и сохранено",
        })
      } catch (error) {
        console.error('Error saving audio to database:', error)
        toast({
          variant: "destructive",
          title: "Предупреждение",
          description: "Аудио сгенерировано, но не удалось сохранить в базе данных",
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
    // Используем serverAudioUrl или audioData (который теперь тоже URL)
    const audioUrl = serverAudioUrl || audioData
    
    if (!audioUrl) return

    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `voiceover-${Date.now()}.mp3`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
