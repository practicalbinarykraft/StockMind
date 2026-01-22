import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { Skeleton } from "@/shared/ui/skeleton"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { AlertCircle, Volume2, Play, Pause, User, Globe } from "lucide-react"
import type { Voice } from "../types"

interface VoiceSelectorProps {
  voices: Voice[] | undefined
  voicesLoading: boolean
  voicesError: Error | null
  selectedVoice: string
  previewingVoice: string | null
  myVoices: Voice[]
  publicVoices: Voice[]
  onVoiceSelect: (voiceId: string) => void
  onPreview: (voiceId: string, previewUrl?: string) => void
}

interface VoiceCardProps {
  voice: Voice
  isSelected: boolean
  isPreviewing: boolean
  onSelect: () => void
  onPreview: () => void
}

function VoiceCard({ voice, isSelected, isPreviewing, onSelect, onPreview }: VoiceCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
        isSelected ? "border-primary bg-primary/5" : "border-border"
      }`}
      onClick={onSelect}
      data-testid={`voice-card-${voice.voice_id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="font-medium">{voice.name}</span>
            {isSelected && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                Selected
              </span>
            )}
          </div>
          {voice.labels?.accent && (
            <p className="text-sm text-muted-foreground mt-1">{voice.labels.accent}</p>
          )}
          {voice.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{voice.description}</p>
          )}
        </div>
        {voice.preview_url && (
          <Button
            variant="outline"
            size="icon"
            className="ml-3"
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            data-testid={`button-preview-${voice.voice_id}`}
          >
            {isPreviewing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

interface VoiceGroupProps {
  title: string
  icon: React.ReactNode
  voices: Voice[]
  selectedVoice: string
  previewingVoice: string | null
  onVoiceSelect: (voiceId: string) => void
  onPreview: (voiceId: string, previewUrl?: string) => void
  limit?: number
}

function VoiceGroup({
  title,
  icon,
  voices,
  selectedVoice,
  previewingVoice,
  onVoiceSelect,
  onPreview,
  limit
}: VoiceGroupProps) {
  const displayVoices = limit ? voices.slice(0, limit) : voices

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">({voices.length})</span>
      </div>
      <div className="space-y-2">
        {displayVoices.map(voice => (
          <VoiceCard
            key={voice.voice_id}
            voice={voice}
            isSelected={selectedVoice === voice.voice_id}
            isPreviewing={previewingVoice === voice.voice_id}
            onSelect={() => onVoiceSelect(voice.voice_id)}
            onPreview={() => onPreview(voice.voice_id, voice.preview_url)}
          />
        ))}
      </div>
    </div>
  )
}

export function VoiceSelector({
  voices,
  voicesLoading,
  voicesError,
  selectedVoice,
  previewingVoice,
  myVoices,
  publicVoices,
  onVoiceSelect,
  onPreview,
}: VoiceSelectorProps) {
  if (voicesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <p className="text-sm text-muted-foreground">Loading voices...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (voicesError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-voices">
              {voicesError.message || "Failed to load voices. Please check your ElevenLabs API key in Settings."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!voices || voices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No voices available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="voice-select">Select voice profile</Label>
        <div className="mt-4 space-y-6">
          {myVoices.length > 0 && (
            <VoiceGroup
              title="My Voices"
              icon={<User className="h-4 w-4 text-muted-foreground" />}
              voices={myVoices}
              selectedVoice={selectedVoice}
              previewingVoice={previewingVoice}
              onVoiceSelect={onVoiceSelect}
              onPreview={onPreview}
            />
          )}

          {publicVoices.length > 0 && (
            <VoiceGroup
              title="Public Voices"
              icon={<Globe className="h-4 w-4 text-muted-foreground" />}
              voices={publicVoices}
              selectedVoice={selectedVoice}
              previewingVoice={previewingVoice}
              onVoiceSelect={onVoiceSelect}
              onPreview={onPreview}
              limit={6}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
