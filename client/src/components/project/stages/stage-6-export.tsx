import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Download, CheckCircle2, Film, Share2, AlertCircle, Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface Stage6Props {
  project: Project
  stepData: any
}

export function Stage6FinalExport({ project, stepData }: Stage6Props) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Get video data from Stage 5
  const videoUrl = stepData[5]?.videoUrl
  const videoDuration = stepData[5]?.duration
  const thumbnailUrl = stepData[5]?.thumbnailUrl
  
  // Get other data from previous stages
  const selectedTemplate = stepData[3]?.selectedTemplate
  const selectedVoice = stepData[4]?.selectedVoice
  const selectedAvatar = stepData[5]?.selectedAvatar
  const scriptScore = stepData[3]?.overallScore

  // Complete project mutation
  const completeProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "PUT",
        `/api/projects/${project.id}`,
        { status: 'completed' }
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Completed",
        description: "Your video project has been marked as complete!",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete project",
      })
    }
  })

  const handleDownload = () => {
    if (!videoUrl) return
    window.open(videoUrl, '_blank')
  }

  const handleShare = () => {
    if (!videoUrl) return
    navigator.clipboard.writeText(videoUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Link Copied",
      description: "Video link copied to clipboard!",
    })
  }

  const handleComplete = () => {
    completeProjectMutation.mutate()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-8 w-8 text-chart-2" />
          <h1 className="text-3xl font-bold">Video Ready!</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Your video has been generated successfully
        </p>
      </div>

      <div className="space-y-6">
        {!videoUrl ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No video found. Please complete Stage 5 to generate your video.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Video Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Video Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    poster={thumbnailUrl}
                    data-testid="video-final"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button className="gap-2" onClick={handleDownload} data-testid="button-download-video">
                    <Download className="h-4 w-4" />
                    Download Video
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleShare} data-testid="button-share-video">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {videoDuration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{videoDuration.toFixed(1)}s</span>
                  </div>
                )}
                {selectedTemplate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium">{selectedTemplate}</span>
                  </div>
                )}
                {selectedVoice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Voice:</span>
                    <span className="font-medium">{selectedVoice}</span>
                  </div>
                )}
                {selectedAvatar && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avatar:</span>
                    <span className="font-medium">{selectedAvatar}</span>
                  </div>
                )}
                {scriptScore !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AI Score:</span>
                    <span className="font-medium">{scriptScore}/100</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" data-testid="button-stage7">
            Add Storyboard (Optional)
          </Button>
          <Button size="lg" className="flex-1 gap-2" onClick={handleComplete} data-testid="button-complete">
            <CheckCircle2 className="h-5 w-5" />
            Complete Project
          </Button>
        </div>
      </div>
    </div>
  )
}
