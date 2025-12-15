import { useState, useEffect, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Voice, Stage4StepData } from "../types"

interface UseStage4DataProps {
  projectId: string
  stepData: any
}

interface UseStage4DataReturn {
  // Script data
  finalScript: string
  setFinalScript: (script: string) => void
  activeVersion: undefined

  // Mode
  mode: "generate" | "upload"
  setMode: (mode: "generate" | "upload") => void

  // Voice data
  voices: Voice[] | undefined
  voicesLoading: boolean
  voicesError: Error | null
  selectedVoice: string
  setSelectedVoice: (voiceId: string) => void
  myVoices: Voice[]
  publicVoices: Voice[]

  // Stage 4 step data
  stage4Data: any
  isStepSkipped: boolean
  isStepCompleted: boolean

  // Audio URLs
  serverAudioUrl: string | null
  setServerAudioUrl: (url: string | null) => void
}

export function useStage4Data({ projectId, stepData }: UseStage4DataProps): UseStage4DataReturn {
  // Debug log to see what stepData we receive from Stage 3
  console.log("[Stage4] useStage4Data received stepData:", {
    hasStepData: !!stepData,
    keys: stepData ? Object.keys(stepData) : [],
    hasFinalScript: !!stepData?.finalScript,
    finalScriptScenes: stepData?.finalScript?.scenes?.length,
    finalScriptScenesTexts: stepData?.finalScript?.scenes?.map((s: any) => s.text?.slice(0, 50)),
  })

  const [mode, setMode] = useState<"generate" | "upload">("generate")
  const [finalScript, setFinalScript] = useState("")
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null)
  const hasRestoredRef = useRef(false)

  // activeVersion is kept for compatibility but not used for script loading
  const activeVersion = undefined

  // Fetch Stage 4 saved data
  const { data: stage4Data } = useQuery({
    queryKey: ["/api/projects", projectId, "steps", 4],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/steps`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error("Failed to fetch steps")
      const steps = await res.json()
      const step4 = steps.find((s: any) => s.stepNumber === 4)
      return step4 ?? null
    }
  })

  // Check step status
  const isStepSkipped = !!stage4Data?.skipReason
  const isStepCompleted = !!stage4Data?.completedAt

  // Fetch available voices
  const { data: voices, isLoading: voicesLoading, error: voicesError } = useQuery<Voice[]>({
    queryKey: ["/api/elevenlabs/voices"],
  })

  // Group voices by category
  const { myVoices, publicVoices } = useMemo(() => {
    if (!voices) return { myVoices: [], publicVoices: [] }

    const my = voices.filter(v => v.category !== 'premade')
    const pub = voices.filter(v => v.category === 'premade')

    return { myVoices: my, publicVoices: pub }
  }, [voices])

  // Load script ONLY from stepData.finalScript.scenes (user-selected variants from Stage 3)
  // No fallbacks - only the script with scenes selected by user in Step3_2_Constructor
  useEffect(() => {
    // Skip if already have script
    if (finalScript) return

    // ONLY load from finalScript.scenes - this contains user-selected variants
    if (stepData?.finalScript?.scenes?.length > 0) {
      const userSelectedScript = stepData.finalScript.scenes.map((s: any) => s.text).join("\n\n")
      console.log("[Stage4] Loading user-selected script from finalScript.scenes:", userSelectedScript.slice(0, 100) + "...")
      setFinalScript(userSelectedScript)
    } else {
      console.warn("[Stage4] No finalScript.scenes found in stepData - user has not completed scene selection in Stage 3")
    }
  }, [stepData, finalScript])

  // Restore UI state from Stage 4 saved data (voice, audio, mode)
  useEffect(() => {
    const savedStepData = stage4Data?.data as Stage4StepData | undefined
    if (savedStepData && savedStepData.mode && !hasRestoredRef.current) {
      hasRestoredRef.current = true
      setMode(savedStepData.mode)

      if (savedStepData.mode === "generate") {
        if (savedStepData.selectedVoice) setSelectedVoice(savedStepData.selectedVoice)
        if (savedStepData.audioUrl) setServerAudioUrl(savedStepData.audioUrl)
      } else if (savedStepData.mode === "upload") {
        if (savedStepData.audioUrl) {
          setServerAudioUrl(savedStepData.audioUrl)
        }
      }
    }
  }, [stage4Data])

  // Set default voice
  useEffect(() => {
    if (voices && voices.length > 0 && !selectedVoice && !stage4Data?.data?.selectedVoice) {
      setSelectedVoice(voices[0].voice_id)
    }
  }, [voices, selectedVoice, stage4Data])

  return {
    finalScript,
    setFinalScript,
    activeVersion,
    mode,
    setMode,
    voices,
    voicesLoading,
    voicesError: voicesError as Error | null,
    selectedVoice,
    setSelectedVoice,
    myVoices,
    publicVoices,
    stage4Data,
    isStepSkipped,
    isStepCompleted,
    serverAudioUrl,
    setServerAudioUrl,
  }
}
