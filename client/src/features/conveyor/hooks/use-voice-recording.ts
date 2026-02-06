/**
 * Хук для записи голоса через микрофон (MediaRecorder API)
 * ≤200 строк
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'

interface UseVoiceRecordingReturn {
  isRecording: boolean
  isPaused: boolean
  recordedUrl: string | null
  duration: number
  error: string | null
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<void>
  discardRecording: () => void
}

export function useVoiceRecording(scriptId: string): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<number | null>(null)

  // Загрузка существующей записи
  useEffect(() => {
    scriptMediaService
      .getMedia(scriptId)
      .then((media) => {
        if (media?.audioUrl && media.audioMode === 'record') {
          setRecordedUrl(media.audioUrl)
        }
      })
      .catch(console.error)
  }, [scriptId])

  // Таймер записи
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording, isPaused])

  const startRecording = useCallback(async () => {
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000) // Сохранять chunk каждую секунду
      mediaRecorderRef.current = mediaRecorder

      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Не удалось получить доступ к микрофону'
      setError(message)
      console.error('Recording start error:', err)
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!
      
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        })

        try {
          // Загрузка на сервер
          const formData = new FormData()
          formData.append('audio', file)
          formData.append('scriptId', scriptId)

          // Используем fetch напрямую для FormData
          const response = await fetch('/api/upload/audio', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Ошибка загрузки' }))
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }

          const data = await response.json()

          // Сохранение в scripts_media
          await scriptMediaService.updateAudio(scriptId, {
            audioUrl: data.url,
            audioMode: 'record',
            audioFilename: file.name,
            audioFilesize: file.size,
            audioGeneratedAt: new Date().toISOString(),
          })

          setRecordedUrl(data.url)
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Ошибка сохранения записи'
          setError(message)
          console.error('Recording save error:', err)
        }

        // Остановка потока
        recorder.stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
        setIsPaused(false)
        resolve()
      }

      recorder.stop()
    })
  }, [scriptId])

  const discardRecording = useCallback(() => {
    setRecordedUrl(null)
    setDuration(0)
    chunksRef.current = []
  }, [])

  return {
    isRecording,
    isPaused,
    recordedUrl,
    duration,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  }
}
