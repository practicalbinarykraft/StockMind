/**
 * Вкладка записи аудио через микрофон
 * ≤100 строк
 */

import { Card, CardContent } from '@/shared/ui/card'
import { VoiceRecorder } from './VoiceRecorder'
import { SimpleAudioPlayer } from './SimpleAudioPlayer'
import { useVoiceRecording } from '@/features/conveyor/hooks/use-voice-recording'

interface AudioRecordTabProps {
  scriptId: string
  scriptText: string
}

export function AudioRecordTab({ scriptId, scriptText }: AudioRecordTabProps) {
  const {
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
  } = useVoiceRecording(scriptId)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <VoiceRecorder
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            onStart={startRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={stopRecording}
            onDiscard={discardRecording}
          />
          {error && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {recordedUrl && (
        <SimpleAudioPlayer 
          audioUrl={recordedUrl} 
          filename={recordedFilename || `recorded-audio-${new Date().getTime()}.webm`}
          uploadedFileName={recordedFilename || undefined}
        />
      )}

      {scriptText && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">Текст для озвучки:</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {scriptText}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
