/**
 * Упрощённый селектор голосов для conveyor
 * ≤100 строк
 */

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Loader2, Volume2 } from 'lucide-react'
import { apiRequest } from '@/shared/api/http'

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: {
    accent?: string
    age?: string
    gender?: string
  }
}

interface SimpleVoiceSelectorProps {
  selectedVoice: string
  onVoiceSelect: (voiceId: string) => void
}

export function SimpleVoiceSelector({ selectedVoice, onVoiceSelect }: SimpleVoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка голосов
  useEffect(() => {
    const loadVoices = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiRequest('GET', '/api/elevenlabs/voices')
        const data = await response.json()

        // Поддержка обоих форматов: массив напрямую или объект с полем voices
        const voicesArray = Array.isArray(data) ? data : (data.voices || [])
        
        if (Array.isArray(voicesArray) && voicesArray.length > 0) {
          // Сортировка: сначала свои голоса (cloned/generated), потом предустановленные (premade)
          const sortedVoices = [...voicesArray].sort((a, b) => {
            const isACustom = a.category === 'cloned' || a.category === 'generated'
            const isBCustom = b.category === 'cloned' || b.category === 'generated'
            
            // Свои голоса идут первыми
            if (isACustom && !isBCustom) return -1
            if (!isACustom && isBCustom) return 1
            
            // Внутри группы сортируем по имени
            return a.name.localeCompare(b.name)
          })
          
          setVoices(sortedVoices)
        } else {
          setError('Список голосов пуст')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки голосов')
        console.error('Failed to load voices:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadVoices()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Загрузка голосов...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
        {error}
      </div>
    )
  }

  return (
    <Select value={selectedVoice} onValueChange={onVoiceSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Выберите голос">
          {selectedVoice && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span>
                {voices.find((v) => v.voice_id === selectedVoice)?.name || 'Голос выбран'}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {voices.map((voice, index) => {
          // Определяем, является ли голос кастомным
          const isCustom = voice.category === 'cloned' || voice.category === 'generated'
          const prevVoice = index > 0 ? voices[index - 1] : null
          const prevIsCustom = prevVoice ? (prevVoice.category === 'cloned' || prevVoice.category === 'generated') : false
          
          // Показываем разделитель между своими и предустановленными голосами
          const showDivider = index > 0 && prevIsCustom && !isCustom
          
          return (
            <div key={voice.voice_id}>
              {showDivider && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Предустановленные голоса
                </div>
              )}
              <SelectItem value={voice.voice_id}>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <div>
                    <div className="font-medium">
                      {voice.name}
                      {isCustom && <span className="ml-1.5 text-xs text-primary">●</span>}
                    </div>
                    {voice.labels?.accent && (
                      <div className="text-xs text-muted-foreground">{voice.labels.accent}</div>
                    )}
                  </div>
                </div>
              </SelectItem>
            </div>
          )
        })}
      </SelectContent>
    </Select>
  )
}
