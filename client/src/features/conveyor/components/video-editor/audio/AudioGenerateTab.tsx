/**
 * Вкладка генерации аудио через ElevenLabs
 * ≤150 строк
 */

import { SimpleVoiceSelector } from './SimpleVoiceSelector'
import { SimpleAudioPlayer } from './SimpleAudioPlayer'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Loader2 } from 'lucide-react'
import { useAudioGeneration } from '@/features/conveyor/hooks/use-audio-generation'

interface AudioGenerateTabProps {
  scriptId: string
  scriptText: string
  onAudioGenerated?: () => void
}

export function AudioGenerateTab({ scriptId, scriptText, onAudioGenerated }: AudioGenerateTabProps) {
  const {
    selectedVoice,
    setSelectedVoice,
    isGenerating,
    audioUrl,
    generate,
    error,
    voiceName,
  } = useAudioGeneration(scriptId, onAudioGenerated)

  const handleGenerate = async () => {
    if (!selectedVoice) return
    await generate(scriptText, selectedVoice)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Выберите голос
              </label>
              <SimpleVoiceSelector
                selectedVoice={selectedVoice || ''}
                onVoiceSelect={setSelectedVoice}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedVoice || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                'Сгенерировать аудио'
              )}
            </Button>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {audioUrl && (
        <SimpleAudioPlayer 
          audioUrl={audioUrl}
          scriptId={scriptId}
          filename={`generated-audio-${voiceName || 'voice'}-${new Date().getTime()}.mp3`}
          voiceName={voiceName || undefined}
        />
      )}
    </div>
  )
}
