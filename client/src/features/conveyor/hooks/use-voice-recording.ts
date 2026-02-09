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
  recordedFilename: string | null
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
  const [recordedFilename, setRecordedFilename] = useState<string | null>(null)
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
          if (media.audioFilename) {
            setRecordedFilename(media.audioFilename)
          }
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
      // Проверка поддержки API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Ваш браузер не поддерживает запись аудио. ' +
          'Попробуйте использовать современный браузер (Chrome, Firefox, Edge) ' +
          'и убедитесь, что сайт открыт по HTTPS.'
        )
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Проверка поддержки MediaRecorder
      if (!window.MediaRecorder) {
        throw new Error('Ваш браузер не поддерживает запись аудио (MediaRecorder API недоступен)')
      }

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
      let message = 'Не удалось получить доступ к микрофону'
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.'
        } else if (err.name === 'NotFoundError') {
          message = 'Микрофон не найден. Подключите микрофон и попробуйте снова.'
        } else if (err.name === 'NotReadableError') {
          message = 'Микрофон занят другим приложением. Закройте другие программы, использующие микрофон.'
        } else {
          message = err.message
        }
      }
      
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
          const response = await fetch('/api/audio/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`
            const contentType = response.headers.get('content-type')
            
            if (contentType?.includes('application/json')) {
              const errorData = await response.json().catch(() => ({}))
              errorMessage = errorData.message || errorMessage
            } else {
              errorMessage = `Ошибка сервера (${response.status}). Проверьте, что роут /api/audio/upload доступен`
            }
            
            throw new Error(errorMessage)
          }

          const contentType = response.headers.get('content-type')
          
          if (!contentType?.includes('application/json')) {
            throw new Error('Сервер вернул некорректный ответ. Ожидался JSON.')
          }

          const data = await response.json()

          if (!data.audioUrl) {
            throw new Error('Не удалось получить URL загруженного файла')
          }

          // Сохранение в scripts_media
          await scriptMediaService.updateAudio(scriptId, {
            audioUrl: data.audioUrl,
            audioMode: 'record',
            audioFilename: file.name,
            audioFilesize: file.size,
            audioGeneratedAt: new Date().toISOString(),
          })

          setRecordedUrl(data.audioUrl)
          setRecordedFilename(file.name)
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
    setRecordedFilename(null)
    setDuration(0)
    chunksRef.current = []
  }, [])

  return {
    isRecording,
    isPaused,
    recordedUrl,
    recordedFilename,
    duration,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  }
}
