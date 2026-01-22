import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/shared/hooks/use-toast"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Mic, Upload, Loader2, AlertCircle, FastForward } from "lucide-react"

import { useStage4Data, useVoiceGeneration, useAudioUpload } from "./hooks"
import { VoiceSelector, ScriptEditor, AudioPlayer, AudioUploader } from "./components"
import { useStageData } from "../../hooks/useStageData"

export function Stage4VoiceGeneration() {
  const { project } = useStageData()
  const { toast } = useToast()
  const [showVideoSkipDialog, setShowVideoSkipDialog] = useState(false)
  const [showAudioUploadInstruction, setShowAudioUploadInstruction] = useState(false)

  // Data management hook
  const {
    finalScript,
    setFinalScript,
    initialScript,
    setInitialScript,
    savedScript,
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
  } = useStage4Data()

  // Voice generation hook
  const voiceGeneration = useVoiceGeneration({
    finalScript,
    selectedVoice,
    activeVersion,
    onAudioGenerated: setServerAudioUrl,
  })

  // Audio upload hook
  const audioUpload = useAudioUpload({
    onUploadSuccess: setServerAudioUrl,
  })

  // Show instruction when user switches to upload mode (for video skip dialog)
  useEffect(() => {
    if (mode === "upload" && showVideoSkipDialog) {
      setShowAudioUploadInstruction(true)
    } else if (mode === "generate") {
      setShowAudioUploadInstruction(false)
    }
  }, [mode, showVideoSkipDialog])

  // Skip step 4 mutation (voice)
  const skipStep4Mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps/4/skip`, {
        reason: "custom_voice"
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось пропустить этап озвучки",
      })
    }
  })

  // Skip step 5 mutation (video)
  const skipStep5Mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps/5/skip`, {
        reason: "custom_video"
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось пропустить этап видео",
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
            finalScript, // Save script for Stage 5
            audioUrl: serverAudioUrl || stage4Data?.data?.audioUrl,
            filename: audioUpload.uploadedFile?.name || stage4Data?.data?.filename,
            filesize: audioUpload.uploadedFile?.size || stage4Data?.data?.filesize,
          }

      return await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 4,
        data: stepDataToSave
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps", 4] })
    }
  })

  // Save script only mutation (when user clicks Save button)
  const saveScriptMutation = useMutation({
    mutationFn: async (scriptToSave: string) => {
      const stepDataToSave = {
        ...stage4Data?.data,
        mode: mode,
        finalScript: scriptToSave,
        selectedVoice: mode === "generate" ? selectedVoice : undefined,
        audioUrl: serverAudioUrl || stage4Data?.data?.audioUrl,
      }

      console.log("[Stage4] 💾 Saving script to server:", {
        projectId: project.id,
        stepNumber: 4,
        scriptLength: scriptToSave.length,
        scriptPreview: scriptToSave.slice(0, 100) + "...",
        dataToSave: stepDataToSave
      })

      const result = await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 4,
        data: stepDataToSave
      })

      console.log("[Stage4] ✅ Script saved successfully:", result)
      return result
    },
    onSuccess: async (result, scriptToSave) => {
      console.log("[Stage4] 🔄 Refetching step data after save...")
      // Wait for data to be refetched before showing success message
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id, "steps", 4] })
      console.log("[Stage4] ✅ Step data refetched")
      
      // Update initialScript to the saved value so button becomes inactive
      setInitialScript(scriptToSave)
      toast({
        title: "Сценарий сохранён",
        description: "Изменения в сценарии успешно сохранены",
      })
    },
    onError: (error: any) => {
      console.error("[Stage4] ❌ Error saving script:", error)
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить сценарий",
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

  // Handler: Show video skip dialog
  const handleSkipVoiceClick = () => {
    setShowVideoSkipDialog(true)
  }

  // Handler: Skip both voice and video, go to stage 6
  const handleSkipVideoYes = async () => {
    try {
      // Save finalScript to step 4 before skipping (needed for Stage 6)
      if (!stage4Data?.data?.finalScript && finalScript) {
        await apiRequest("POST", `/api/projects/${project.id}/steps`, {
          stepNumber: 4,
          data: { finalScript }
        })
      }
      // Skip step 4 - server will auto-advance to stage 5
      await skipStep4Mutation.mutateAsync()
      // Skip step 5 - server will auto-advance to stage 6
      await skipStep5Mutation.mutateAsync()
      
      // Force refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      
      toast({
        title: "Переход к результату",
        description: "Переходим к просмотру результата...",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось пропустить этапы",
      })
    }
  }

  // Handler: User wants to generate video, check if audio exists
  const handleSkipVideoNo = async () => {
    const hasAudio = stage4Data?.data?.audioUrl || serverAudioUrl

    if (!hasAudio) {
      // No audio - show upload tab with instruction in alert
      setMode("upload")
      setShowAudioUploadInstruction(true)
      // Don't close dialog, show instruction instead
    } else {
      // Has audio - save and proceed to stage 5 (don't skip step 4)
      try {
        // Save current state (audio + script) before proceeding
        if (!stage4Data?.data?.audioUrl || !stage4Data?.data?.finalScript) {
          await saveStepMutation.mutateAsync()
        }
        // Move to stage 5 (don't skip step 4, just complete it with uploaded audio)
        await updateProjectMutation.mutateAsync()
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: error.message || "Не удалось перейти к следующему этапу",
        })
      }
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
      {!showVideoSkipDialog && (
        <Alert className="mb-6" data-testid="alert-skip-stage4">
          <FastForward className="h-4 w-4" />
          <div className="flex-1">
            {mode === "upload" ? (
              <>
                <h5 className="font-semibold mb-1">Загрузите аудио</h5>
                <AlertDescription>
                  После добавления аудио нажмите 'Continue to Avatar Selection' чтобы перейти к генерации видео
                </AlertDescription>
              </>
            ) : (
              <>
                <h5 className="font-semibold mb-1">Пропустить озвучку?</h5>
                <AlertDescription className="mb-3">
                  Если у вас уже есть своя озвучка, вы можете пропустить этот этап и сразу перейти к следующему
                </AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipVoiceClick}
                  data-testid="button-skip-stage4"
                >
                  <FastForward className="h-4 w-4 mr-2" />
                  Пропустить - у меня своя озвучка
                </Button>
              </>
            )}
          </div>
        </Alert>
      )}

      {/* Video Skip Dialog */}
      {showVideoSkipDialog && (
        <Alert className="mb-6" data-testid="alert-skip-video">
          <FastForward className="h-4 w-4" />
          <div className="flex-1">
            {!showAudioUploadInstruction ? (
              <>
                <h5 className="font-semibold mb-1">Пропустить генерацию видео?</h5>
                <AlertDescription className="mb-3">
                  Если у вас уже есть своё видео, вы можете пропустить генерацию видео по аватару и сразу перейти к результату. В противном случае, добавьте аудио и перейдите к выбору аватара для создания видео.
                </AlertDescription>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkipVideoYes}
                    disabled={skipStep4Mutation.isPending || skipStep5Mutation.isPending}
                    data-testid="button-skip-video-yes"
                  >
                    {skipStep4Mutation.isPending || skipStep5Mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Пропускаем...
                      </>
                    ) : (
                      "Да, пропустить"
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSkipVideoNo}
                    disabled={skipStep4Mutation.isPending || saveStepMutation.isPending || updateProjectMutation.isPending}
                    data-testid="button-skip-video-no"
                  >
                    {skipStep4Mutation.isPending || saveStepMutation.isPending || updateProjectMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      "Нет, я хочу сгенерировать видео"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h5 className="font-semibold mb-1">Загрузите аудио</h5>
                <AlertDescription>
                  После добавления аудио нажмите 'Continue to Avatar Selection' чтобы перейти к генерации видео
                </AlertDescription>
              </>
            )}
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
          <ScriptEditor 
            value={finalScript} 
            onChange={setFinalScript}
            initialScript={initialScript}
            savedScript={savedScript}
            onSave={async (script) => {
              await saveScriptMutation.mutateAsync(script)
            }}
            isSaving={saveScriptMutation.isPending}
          />

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
          <ScriptEditor 
            value={finalScript} 
            onChange={setFinalScript}
            initialScript={initialScript}
            savedScript={savedScript}
            onSave={async (script) => {
              await saveScriptMutation.mutateAsync(script)
            }}
            isSaving={saveScriptMutation.isPending}
          />

          <AudioUploader
            uploadedFile={audioUpload.uploadedFile}
            uploadedAudioUrl={audioUpload.uploadedAudioUrl}
            savedFilename={stage4Data?.data?.filename}
            savedFilesize={stage4Data?.data?.filesize}
            isDragging={audioUpload.isDragging}
            isPlaying={audioUpload.isUploadPlaying}
            audioRef={audioUpload.uploadAudioRef}
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
