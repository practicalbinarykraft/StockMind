import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { type Project } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Play, Pause, Download, Loader2, AlertCircle, Volume2, Upload } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Stage4Props {
  project: Project
  stepData: any
}

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  description?: string
  preview_url?: string
}

export function Stage4VoiceGeneration({ project, stepData }: Stage4Props) {
  const { toast } = useToast()

  // Get script from previous stage analysis
  const analysisData = stepData
  const defaultScript = analysisData?.scenes?.map((s: any) => s.text).join(" ") || 
                       analysisData?.text ||
                       "Enter your script here..."
  
  const [mode, setMode] = useState<"generate" | "upload">("generate")
  const [finalScript, setFinalScript] = useState(defaultScript)
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [audioData, setAudioData] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploadPlaying, setIsUploadPlaying] = useState(false)
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const uploadAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Fetch available voices
  const { data: voices, isLoading: voicesLoading, error: voicesError } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
  })

  // Set default voice when voices load
  useEffect(() => {
    if (voices && voices.length > 0 && !selectedVoice) {
      setSelectedVoice(voices[0].voice_id)
    }
  }, [voices, selectedVoice])

  // Generate audio mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/elevenlabs/generate", {
        voiceId: selectedVoice,
        text: finalScript,
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      })
      return await res.json()
    },
    onSuccess: (data) => {
      setAudioData(data.audio)
      setIsPlaying(false)
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate()
  }

  const handlePlayPause = () => {
    if (!audioRef.current || !audioData) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handlePreview = (voiceId: string, previewUrl?: string) => {
    if (!previewUrl) return

    // Stop generated audio if playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }

    // Toggle preview
    if (previewingVoice === voiceId && previewAudioRef.current) {
      previewAudioRef.current.pause()
      setPreviewingVoice(null)
    } else {
      // Stop any other preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
      
      // Play new preview
      const audio = new Audio(previewUrl)
      previewAudioRef.current = audio
      audio.play()
      setPreviewingVoice(voiceId)
      audio.onended = () => setPreviewingVoice(null)
    }
  }

  const handleDownload = () => {
    if (!audioData) return

    const blob = new Blob(
      [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
      { type: 'audio/mpeg' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voiceover-${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleProceed = async () => {
    // Validate based on mode
    if (mode === "generate") {
      if (!audioData || !selectedVoice) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please generate audio first",
        })
        return
      }
    } else if (mode === "upload") {
      if (!uploadedFile || !serverAudioUrl) {
        toast({
          variant: "destructive",
          title: "Error",
          description: uploadMutation.isPending ? "Audio is uploading, please wait..." : "Please upload an audio file first",
        })
        return
      }
    }

    try {
      await saveStepMutation.mutateAsync()
      await updateProjectMutation.mutateAsync()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save and proceed",
      })
    }
  }

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('audio', file)
      
      const res = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      })
      
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to upload audio")
      }
      
      return await res.json()
    },
    onSuccess: (data) => {
      console.log('Audio uploaded successfully:', data)
      setServerAudioUrl(data.audioUrl)
    },
  })

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async () => {
      const stepDataToSave = mode === "generate" 
        ? {
            mode: "generate",
            finalScript,
            selectedVoice,
            audioData,
          }
        : {
            mode: "upload",
            audioUrl: serverAudioUrl,
            filename: uploadedFile?.name,
            filesize: uploadedFile?.size,
          }

      return await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 4,
        data: stepDataToSave
      })
    }
  })

  // Update project stage mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 5
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      
      toast({
        title: "Audio Saved",
        description: "Moving to Avatar Selection...",
      })
    }
  })

  // File upload handlers
  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      alert('Please upload a valid audio file (MP3, WAV, or M4A)')
      return
    }

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB')
      return
    }

    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setUploadedAudioUrl(url)
    
    // Upload to server
    uploadMutation.mutate(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUploadPlayPause = () => {
    if (!uploadAudioRef.current || !uploadedAudioUrl) return

    if (isUploadPlaying) {
      uploadAudioRef.current.pause()
      setIsUploadPlaying(false)
    } else {
      uploadAudioRef.current.play()
      setIsUploadPlaying(true)
    }
  }

  const handleUploadDownload = () => {
    if (!uploadedFile) return

    const url = URL.createObjectURL(uploadedFile)
    const a = document.createElement('a')
    a.href = url
    a.download = uploadedFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get selected voice details
  const selectedVoiceDetails = voices?.find(v => v.voice_id === selectedVoice)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mic className="h-8 w-8 text-chart-2" />
          <h1 className="text-3xl font-bold">Voice & Audio</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Generate AI voiceover or upload your own audio file
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "generate" | "upload")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Mic className="h-4 w-4 mr-2" />
            Generate Voice
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Audio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
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
            {voicesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <p className="text-sm text-muted-foreground">Loading voices...</p>
              </div>
            ) : voicesError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="error-voices">
                  {(voicesError as any)?.message || "Failed to load voices. Please check your ElevenLabs API key in Settings."}
                </AlertDescription>
              </Alert>
            ) : voices && voices.length > 0 ? (
              <>
                <Label htmlFor="voice-select">Select voice profile</Label>
                <div className="mt-2 space-y-3">
                  {voices.slice(0, 6).map(voice => (
                    <div
                      key={voice.voice_id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                        selectedVoice === voice.voice_id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedVoice(voice.voice_id)}
                      data-testid={`voice-card-${voice.voice_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            <span className="font-medium">{voice.name}</span>
                            {selectedVoice === voice.voice_id && (
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
                              handlePreview(voice.voice_id, voice.preview_url)
                            }}
                            data-testid={`button-preview-${voice.voice_id}`}
                          >
                            {previewingVoice === voice.voice_id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No voices available</p>
            )}
          </CardContent>
        </Card>

        {/* Generate Audio */}
        <Card>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !finalScript.trim() || !selectedVoice || voicesLoading}
              data-testid="button-generate-audio"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Audio...
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  {audioData ? "Regenerate Audio" : "Generate Audio"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {generateMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-generation">
              {(generateMutation.error as any)?.message || "Failed to generate audio. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Audio Player */}
        {audioData && (
          <>
            <audio
              ref={audioRef}
              src={`data:audio/mpeg;base64,${audioData}`}
              onEnded={() => setIsPlaying(false)}
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
                    onClick={handlePlayPause}
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
                      <div className={`h-full bg-primary transition-all ${isPlaying ? 'w-full' : 'w-0'}`} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{selectedVoiceDetails?.name || "Voice"}</span>
                      <span>MP3</span>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleDownload} data-testid="button-download-audio">
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={!audioData || saveStepMutation.isPending || updateProjectMutation.isPending}
            data-testid="button-proceed-stage5"
          >
            {saveStepMutation.isPending || updateProjectMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Continue to Avatar Selection"
            )}
          </Button>
        </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          {!uploadedFile ? (
            <Card>
              <CardHeader>
                <CardTitle>Upload Audio File</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-lg p-12 text-center hover-elevate cursor-pointer transition-all ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-upload"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drag & Drop Audio File</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse (MP3, WAV, M4A - max 25MB)
                  </p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="audio/mpeg,audio/wav,audio/mp3,audio/x-m4a,audio/mp4,.mp3,.wav,.m4a"
                    onChange={handleFileInputChange}
                    data-testid="input-upload-file"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {uploadedAudioUrl && (
                <>
                  <audio
                    ref={uploadAudioRef}
                    src={uploadedAudioUrl}
                    onEnded={() => setIsUploadPlaying(false)}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Uploaded Audio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleUploadPlayPause}
                          data-testid="button-play-uploaded"
                        >
                          {isUploadPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-primary transition-all ${isUploadPlaying ? 'w-full' : 'w-0'}`} />
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span className="truncate max-w-[300px]" data-testid="text-uploaded-filename">
                              {uploadedFile.name}
                            </span>
                            <span>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={handleUploadDownload} data-testid="button-download-uploaded">
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUploadedFile(null)
                            setUploadedAudioUrl(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          data-testid="button-change-file"
                        >
                          Change File
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              size="lg"
              disabled={!uploadedFile || !serverAudioUrl || uploadMutation.isPending || saveStepMutation.isPending || updateProjectMutation.isPending}
              onClick={handleProceed}
              data-testid="button-proceed-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Uploading...
                </>
              ) : saveStepMutation.isPending || updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Continue to Avatar Selection"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
