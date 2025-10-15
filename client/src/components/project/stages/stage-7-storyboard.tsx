import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Film, Plus, Download } from "lucide-react"

interface Stage7Props {
  project: Project
  stepData: any
}

export function Stage7Storyboard({ project }: Stage7Props) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Film className="h-8 w-8 text-chart-3" />
          <h1 className="text-3xl font-bold">Storyboard & B-Roll</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Add AI-generated footage to enhance your video (optional)
        </p>
      </div>

      <div className="space-y-6">
        {/* Generate Footage */}
        <Card>
          <CardHeader>
            <CardTitle>Generate B-Roll Footage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use Kie.ai to automatically generate relevant B-roll footage based on your script scenes.
            </p>
            <Button className="gap-2" data-testid="button-generate-footage">
              <Plus className="h-4 w-4" />
              Generate Footage
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder for footage grid */}
        <Card>
          <CardContent className="py-16 text-center">
            <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">
              No footage generated yet. Click above to start.
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="lg" data-testid="button-skip-storyboard">
            Skip This Step
          </Button>
          <Button size="lg" className="gap-2" data-testid="button-finalize">
            <Download className="h-4 w-4" />
            Finalize Video
          </Button>
        </div>
      </div>
    </div>
  )
}
