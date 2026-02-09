/**
 * Вкладка загрузки аудио файла
 * ≤80 строк
 */

import { SimpleAudioUploader } from './SimpleAudioUploader'
import { SimpleAudioPlayer } from './SimpleAudioPlayer'
import { Card, CardContent } from '@/shared/ui/card'
import { useAudioUpload } from '@/features/conveyor/hooks/use-audio-upload'

interface AudioUploadTabProps {
  scriptId: string
}

export function AudioUploadTab({ scriptId }: AudioUploadTabProps) {
  const { audioUrl, isUploading, error, upload, audioFilename } = useAudioUpload(scriptId)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <SimpleAudioUploader
            onUpload={upload}
            isUploading={isUploading}
          />
          {error && (
            <div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {audioUrl && (
        <SimpleAudioPlayer 
          audioUrl={audioUrl} 
          filename={audioFilename || `uploaded-audio-${new Date().getTime()}.mp3`}
          uploadedFileName={audioFilename || undefined}
        />
      )}
    </div>
  )
}
