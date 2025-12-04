import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"

interface Scene {
  title: string
  timecode: {
    start: string
    end: string
  }
  script: string
  score?: number
}

interface TimelineProps {
  scenes: Scene[]
  totalDuration?: number
}

// Convert timecode "00:00:05.123" to seconds
const timecodeToSeconds = (timecode: string): number => {
  const [hours, minutes, seconds] = timecode.split(':')
  const [sec, ms] = seconds.split('.')
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(sec) + (ms ? parseInt(ms) / 1000 : 0)
}

// Format seconds to readable duration "0:05"
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function Timeline({ scenes, totalDuration }: TimelineProps) {
  // Calculate scene durations
  const scenesWithDuration = scenes.map(scene => {
    const start = timecodeToSeconds(scene.timecode.start)
    const end = timecodeToSeconds(scene.timecode.end)
    const duration = end - start
    return { ...scene, start, end, duration }
  })

  const calculatedTotal = scenesWithDuration.length > 0 
    ? scenesWithDuration[scenesWithDuration.length - 1].end 
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Project Timeline
          </CardTitle>
          <Badge variant="secondary" className="text-base">
            {formatDuration(totalDuration || calculatedTotal)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scenesWithDuration.map((scene, index) => (
            <div 
              key={index} 
              className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
            >
              <div className="flex-1">
                <div className="font-medium mb-1">{scene.title}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(scene.start)} - {formatDuration(scene.end)}
                  <span className="mx-2">•</span>
                  {scene.duration.toFixed(0)}s
                </div>
              </div>
              {scene.score !== undefined && (
                <Badge 
                  variant="outline"
                  className={
                    scene.score >= 90 ? "border-chart-2 text-chart-2" :
                    scene.score >= 70 ? "border-chart-3 text-chart-3" :
                    scene.score >= 50 ? "border-chart-4 text-chart-4" :
                    "border-chart-5 text-chart-5"
                  }
                >
                  {scene.score}/100
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
