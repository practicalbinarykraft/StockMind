import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, Upload, Loader2, AlertCircle, FastForward } from "lucide-react"

import { useStage4Data, useVoiceGeneration, useAudioUpload } from "./hooks"
import { VoiceSelector, ScriptEditor, AudioPlayer, AudioUploader } from "./components"
import type { Stage4Props } from "./types"

export function Stage4VoiceGeneration({ project, stepData }: Stage4Props) {
  const { toast } = useToast()

  // Data management hook
  const {
    finalScript,
    setFinalScript,
    activeVersion,
    mode,
    setMode,
    voices,
    voicesLoading,
    voicesError,
    selectedVoice,
    setSelectedVoice,
    myVoices,
    publicVoices,
    stage4Data,
    isStepSkipped,
    isStepCompleted,
    serverAudioUrl,
    setServerAudioUrl,
  } = useStage4Data({ projectId: project.id, stepData })

  // Voice generation hook
  const voiceGeneration = useVoiceGeneration({
    projectId: project.id,
    finalScript,
    selectedVoice,
    activeVersion,
    onAudioGenerated: setServerAudioUrl,
  })

  // Audio upload hook
  const audioUpload = useAudioUpload({
    onUploadSuccess: setServerAudioUrl,
  })

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps/4/skip`, {
        reason: "custom_voice"
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })

      toast({
        title: "Этап пропущен",
        description: "Переходим к следующему этапу...",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось пропустить этап",
      })
    }
  })

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async () => {
      const stepDataToSave = mode === "generate"
        ? {
            mode: "generate",
            finalScript,
            selectedVoice,
            audioUrl: serverAudioUrl,
          }
        : {
            mode: "upload",
            audioUrl: serverAudioUrl || stage4Data?.data?.audioUrl,
            filename: audioUpload.uploadedFile?.name || stage4Data?.data?.filename,
            filesize: audioUpload.uploadedFile?.size || stage4Data?.data?.filesize,
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

  const handleProceed = async () => {
    const hasSavedAudio = stage4Data?.data?.audioUrl || serverAudioUrl

    if (!hasSavedAudio) {
      toast({
        variant: "destructive",
        title: "Error",
        description: mode === "generate" ? "Please generate audio first" : "Please upload an audio file first",
      })
      return
    }

    try {
      if (!stage4Data?.data?.audioUrl && serverAudioUrl) {
        await saveStepMutation.mutateAsync()
      }
      await updateProjectMutation.mutateAsync()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to proceed to next stage",
      })
    }
  }

  const selectedVoiceDetails = voices?.find(v => v.voice_id === selectedVoice)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mic className="h-8 w-8 text-chart-2" />
          <h1 className="text-3xl font-bold">Voice & Audio</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Generate AI voiceover or upload your own audio file
        </p>
      </div>

      {/* Skip Step Alert */}
      {!isStepSkipped && !isStepCompleted && (
        <Alert className="mb-6" data-testid="alert-skip-stage4">
          <FastForward className="h-4 w-4" />
          <div className="flex-1">
            <h5 className="font-semibold mb-1">Пропустить озвучку?</h5>
            <AlertDescription className="mb-3">
              Если у вас уже есть своя озвучка, вы можете пропустить этот этап и сразу перейти к следующему
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipStepMutation.mutate()}
              disabled={skipStepMutation.isPending}
              data-testid="button-skip-stage4"
            >
              <FastForward className="h-4 w-4 mr-2" />
              {skipStepMutation.isPending ? "Пропускаем..." : "Пропустить - у меня своя озвучка"}
            </Button>
          </div>
        </Alert>
      )}

      {/* Main Content Tabs */}
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

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <ScriptEditor value={finalScript} onChange={setFinalScript} />

          <VoiceSelector
            voices={voices}
            voicesLoading={voicesLoading}
            voicesError={voicesError}
            selectedVoice={selectedVoice}
            previewingVoice={voiceGeneration.previewingVoice}
            myVoices={myVoices}
            publicVoices={publicVoices}
            onVoiceSelect={setSelectedVoice}
            onPreview={voiceGeneration.handlePreview}
          />

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={voiceGeneration.handleGenerate}
                disabled={voiceGeneration.generateMutation.isPending || !finalScript.trim() || !selectedVoice || voicesLoading}
                data-testid="button-generate-audio"
              >
                {voiceGeneration.generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Audio...
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    {serverAudioUrl || voiceGeneration.audioData ? "Regenerate Audio" : "Generate Audio"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {voiceGeneration.generateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription data-testid="error-generation">
                {(voiceGeneration.generateMutation.error as any)?.message || "Failed to generate audio. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Audio Player */}
          {(serverAudioUrl || voiceGeneration.audioData) && (
            <AudioPlayer
              ref={voiceGeneration.audioRef as React.RefObject<HTMLAudioElement>}
              audioUrl={serverAudioUrl}
              audioData={voiceGeneration.audioData}
              isPlaying={voiceGeneration.isPlaying}
              voiceName={selectedVoiceDetails?.name}
              onPlayPause={voiceGeneration.handlePlayPause}
              onDownload={() => voiceGeneration.handleDownload(serverAudioUrl)}
              onEnded={() => voiceGeneration.setIsPlaying(false)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              size="lg"
              onClick={handleProceed}
              disabled={!serverAudioUrl || saveStepMutation.isPending || updateProjectMutation.isPending}
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

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <AudioUploader
            uploadedFile={audioUpload.uploadedFile}
            uploadedAudioUrl={audioUpload.uploadedAudioUrl}
            savedFilename={stage4Data?.data?.filename}
            savedFilesize={stage4Data?.data?.filesize}
            isDragging={audioUpload.isDragging}
            isPlaying={audioUpload.isUploadPlaying}
            onDragOver={audioUpload.handleDragOver}
            onDragLeave={audioUpload.handleDragLeave}
            onDrop={audioUpload.handleDrop}
            onFileInputChange={audioUpload.handleFileInputChange}
            onPlayPause={audioUpload.handleUploadPlayPause}
            onDownload={() => audioUpload.handleUploadDownload(stage4Data?.data?.filename)}
            onChangeFile={() => {
              audioUpload.setUploadedFile(null)
              audioUpload.setUploadedAudioUrl(null)
            }}
            onEnded={() => audioUpload.setIsUploadPlaying(false)}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              size="lg"
              disabled={!(serverAudioUrl || stage4Data?.data?.audioUrl) || audioUpload.uploadMutation.isPending || saveStepMutation.isPending || updateProjectMutation.isPending}
              onClick={handleProceed}
              data-testid="button-proceed-upload"
            >
              {audioUpload.uploadMutation.isPending ? (
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
