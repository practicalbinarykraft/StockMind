import { forwardRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Play, Pause, Download } from "lucide-react"

interface AudioPlayerProps {
  audioUrl: string | null
  audioData: string | null
  isPlaying: boolean
  voiceName?: string
  onPlayPause: () => void
  onDownload: () => void
  onEnded: () => void
}

function getAudioSrc(audioUrl: string | null, audioData: string | null): string | undefined {
  if (audioUrl) {
    if (audioUrl.startsWith('http') || audioUrl.startsWith('/')) {
      return audioUrl
    }
    return `/${audioUrl}`
  }
  if (audioData) {
    return `data:audio/mpeg;base64,${audioData}`
  }
  return undefined
}

export const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  function AudioPlayer({ audioUrl, audioData, isPlaying, voiceName, onPlayPause, onDownload, onEnded }, ref) {
    const handleError = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      // Log error for debugging but don't show toast
      // Playback errors can occur for various reasons (codec issues, browser quirks)
      // that don't necessarily indicate a problem with generation/upload
      console.error('Audio playback error:', e)
    }

    const src = getAudioSrc(audioUrl, audioData)

    if (!src) return null

    return (
      <>
        <audio
          ref={ref}
          src={src}
          onEnded={onEnded}
          onError={handleError}
        />
        <Card>
          <CardHeader>
            <CardTitle>Audio Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={onPlayPause}
                data-testid="button-play-audio"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full bg-primary transition-all ${isPlaying ? 'w-full' : 'w-0'}`} />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{voiceName || "Voice"}</span>
                  <span>MP3</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={onDownload}
                data-testid="button-download-audio"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }
)
