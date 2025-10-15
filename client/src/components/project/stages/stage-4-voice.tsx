import { useState } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Play, Pause, Download } from "lucide-react"

interface Stage4Props {
  project: Project
  stepData: any
}

// Mock voice options
const VOICE_OPTIONS = [
  { id: "v1", name: "Sarah - Professional", gender: "Female", accent: "American" },
  { id: "v2", name: "James - Authoritative", gender: "Male", accent: "British" },
  { id: "v3", name: "Maria - Warm", gender: "Female", accent: "Spanish" },
  { id: "v4", name: "David - Energetic", gender: "Male", accent: "Australian" },
]

export function Stage4VoiceGeneration({ project }: Stage4Props) {
  const [finalScript, setFinalScript] = useState(
    "Breaking: AI technology reaches new milestone in natural language processing. " +
    "Researchers demonstrate advanced conversational abilities that surpass previous benchmarks. " +
    "Industry experts predict significant impacts across technology sectors within the next year."
  )
  const [selectedVoice, setSelectedVoice] = useState("v1")
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioGenerated, setAudioGenerated] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsGenerating(false)
    setAudioGenerated(true)
  }

  const handleProceed = () => {
    console.log("Proceeding to Stage 5")
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mic className="h-8 w-8 text-chart-2" />
          <h1 className="text-3xl font-bold">Voice Generation</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Select a voice and generate professional voiceover
        </p>
      </div>

      <div className="space-y-6">
        {/* Script Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Final Script</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="final-script">Review and edit your script</Label>
            <Textarea
              id="final-script"
              value={finalScript}
              onChange={(e) => setFinalScript(e.target.value)}
              rows={8}
              className="mt-2"
              data-testid="textarea-final-script"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {finalScript.length} characters • Est. {Math.ceil(finalScript.split(' ').length / 150)} min
            </p>
          </CardContent>
        </Card>

        {/* Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Voice</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="voice-select">Select voice profile</Label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger id="voice-select" className="mt-2" data-testid="select-voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name} • {voice.gender} • {voice.accent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Generate Audio */}
        <Card>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={isGenerating || !finalScript.trim()}
              data-testid="button-generate-audio"
            >
              <Mic className="h-5 w-5" />
              {isGenerating ? "Generating Audio..." : audioGenerated ? "Regenerate Audio" : "Generate Audio"}
            </Button>
          </CardContent>
        </Card>

        {/* Audio Player (shown after generation) */}
        {audioGenerated && (
          <Card>
            <CardHeader>
              <CardTitle>Audio Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  data-testid="button-play-audio"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3 transition-all" />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>0:45</span>
                    <span>2:15</span>
                  </div>
                </div>
                <Button variant="outline" size="icon" data-testid="button-download-audio">
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={!audioGenerated}
            data-testid="button-proceed-stage5"
          >
            Continue to Avatar Selection
          </Button>
        </div>
      </div>
    </div>
  )
}
