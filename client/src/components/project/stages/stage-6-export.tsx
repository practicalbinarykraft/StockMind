import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle2, Film, Share2 } from "lucide-react"

interface Stage6Props {
  project: Project
  stepData: any
}

export function Stage6FinalExport({ project }: Stage6Props) {
  const handleDownload = () => {
    console.log("Downloading video...")
  }

  const handleComplete = () => {
    console.log("Completing project...")
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
        {/* Video Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Video Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-4">
              <Film className="h-24 w-24 text-white/30" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button className="gap-2" onClick={handleDownload} data-testid="button-download-video">
                <Download className="h-4 w-4" />
                Download Video
              </Button>
              <Button variant="outline" className="gap-2" data-testid="button-share-video">
                <Share2 className="h-4 w-4" />
                Share
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">2:15</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-medium">News Update</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voice:</span>
              <span className="font-medium">Sarah - Professional</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avatar:</span>
              <span className="font-medium">Alex - Business Pro</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">AI Score:</span>
              <span className="font-medium">85/100</span>
            </div>
          </CardContent>
        </Card>

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
