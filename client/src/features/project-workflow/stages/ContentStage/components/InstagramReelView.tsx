import { Card, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { Badge } from "@/shared/ui/badge"
import { ScoreBadge } from "@/shared/components/score-badge"
import { RefreshCw } from "lucide-react"

interface InstagramReelViewProps {
  isLoading: boolean
  reel: any
  onContinue: () => void
  isSubmitting: boolean
}

export function InstagramReelView({
  isLoading,
  reel,
  onContinue,
  isSubmitting,
}: InstagramReelViewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!reel) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Instagram Reel not found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-shrink-0 w-32 h-40 bg-muted rounded-md overflow-hidden">
              {reel.thumbnailUrl && (
                <img 
                  src={reel.thumbnailUrl} 
                  alt="Reel thumbnail" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">@{reel.ownerUsername}</h3>
                {reel.caption && (
                  <p className="text-sm text-muted-foreground mt-1">{reel.caption}</p>
                )}
              </div>
              
              {typeof reel.aiScore === 'number' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">AI Score:</span>
                  <ScoreBadge score={reel.aiScore} />
                  {reel.freshnessScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Freshness: {reel.freshnessScore}
                    </Badge>
                  )}
                  {reel.viralityScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Virality: {reel.viralityScore}
                    </Badge>
                  )}
                  {reel.qualityScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Quality: {reel.qualityScore}
                    </Badge>
                  )}
                </div>
              )}

              {reel.aiComment && (
                <div className="p-3 bg-muted/50 rounded text-sm italic border-l-2 border-primary/50">
                  {reel.aiComment}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Transcription ({reel.language || "Unknown"})</Label>
            <div className="mt-2 p-4 bg-muted/50 rounded-md border">
              <p className="text-sm whitespace-pre-wrap">
                {reel.transcriptionText}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {reel.transcriptionText?.length || 0} characters
            </p>
          </div>

          <Button
            size="lg"
            onClick={onContinue}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
            data-testid="button-instagram-continue"
          >
            {isSubmitting ? "Saving..." : "Continue to AI Analysis"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

