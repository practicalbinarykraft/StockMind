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
  initialScript: string
  setInitialScript: (script: string) => void
  savedScript: string
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
    // Normal flow (from Stage 3 constructor)
    hasFinalScript: !!stepData?.finalScript,
    finalScriptScenes: stepData?.finalScript?.scenes?.length,
    finalScriptScenesTexts: stepData?.finalScript?.scenes?.map((s: any) => s.text?.slice(0, 50)),
    // Scripts Library flow
    hasDirectScenes: !!stepData?.scenes,
    directScenesCount: stepData?.scenes?.length,
    directScenesTexts: stepData?.scenes?.map((s: any) => (s.text || s)?.slice?.(0, 50)),
  })

  const [mode, setMode] = useState<"generate" | "upload">("generate")
  const [finalScript, setFinalScript] = useState("")
  const [initialScript, setInitialScript] = useState("") // Original loaded script for comparison
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null)
  const hasRestoredRef = useRef(false)
  const hasLoadedScriptRef = useRef(false)

  // activeVersion is kept for compatibility but not used for script loading
  const activeVersion = undefined

  // Fetch Stage 4 saved data
  const { data: stage4Data, isLoading: stage4DataLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "steps", 4],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/steps`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error("Failed to fetch steps")
      const steps = await res.json()
      const step4 = steps.find((s: any) => s.stepNumber === 4)
      console.log("[Stage4] Fetched stage4Data:", step4)
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

  // Load script from stepData - supports two formats:
  // 1. stepData.finalScript.scenes - normal flow (user completed Stage 3)
  // 2. stepData.scenes - project created from Scripts Library
  // PRIORITY: Load saved script from stage4Data if it exists (user edited and saved)
  useEffect(() => {
    // Skip if already loaded script
    if (hasLoadedScriptRef.current) return

    // Wait for stage4Data to finish loading before deciding what to load
    if (stage4DataLoading) {
      console.log("[Stage4] Waiting for stage4Data to load...")
      return
    }

    console.log("[Stage4] stage4Data loaded, checking for saved script:", {
      hasStage4Data: !!stage4Data,
      hasData: !!stage4Data?.data,
      hasFinalScript: !!(stage4Data?.data as Stage4StepData | undefined)?.finalScript,
      finalScriptPreview: (stage4Data?.data as Stage4StepData | undefined)?.finalScript?.slice(0, 100)
    })

    // PRIORITY 1: Try loading saved script from Stage 4 data (user edited and saved)
    const savedStepData = stage4Data?.data as Stage4StepData | undefined
    if (savedStepData?.finalScript) {
      console.log("[Stage4] ✅ Loading saved edited script from stage4Data:", savedStepData.finalScript.slice(0, 100) + "...")
      setFinalScript(savedStepData.finalScript)
      setInitialScript(savedStepData.finalScript) // Set as initial for comparison
      hasLoadedScriptRef.current = true
      return
    }

    // PRIORITY 2: Try loading from finalScript.scenes (normal flow)
    if (stepData?.finalScript?.scenes?.length > 0) {
      const userSelectedScript = stepData.finalScript.scenes.map((s: any) => s.text).join("\n\n")
      console.log("[Stage4] ✅ Loading user-selected script from finalScript.scenes:", userSelectedScript.slice(0, 100) + "...")
      setFinalScript(userSelectedScript)
      setInitialScript(userSelectedScript) // Set as initial for comparison
      hasLoadedScriptRef.current = true
      return
    }

    // PRIORITY 3: Try loading from scenes directly (Scripts Library flow)
    if (stepData?.scenes?.length > 0) {
      const scriptsLibraryScript = stepData.scenes.map((s: any) => s.text || s).join("\n\n")
      console.log("[Stage4] ✅ Loading script from Scripts Library (scenes):", scriptsLibraryScript.slice(0, 100) + "...")
      setFinalScript(scriptsLibraryScript)
      setInitialScript(scriptsLibraryScript) // Set as initial for comparison
      hasLoadedScriptRef.current = true
      return
    }

    console.warn("[Stage4] ⚠️ No script found in stepData - neither finalScript.scenes nor scenes exist")
  }, [stepData, stage4Data, stage4DataLoading])

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

  // Get saved script from stage4Data for comparison
  const savedScript = (stage4Data?.data as Stage4StepData | undefined)?.finalScript || ""

  return {
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
