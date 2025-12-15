import { useState, useEffect, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Voice, ScriptData, ScriptVersion, Stage4StepData } from "../types"

interface UseStage4DataProps {
  projectId: string
  stepData: any
}

interface UseStage4DataReturn {
  // Script data
  finalScript: string
  setFinalScript: (script: string) => void
  activeVersion: ScriptVersion | undefined

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
    hasScenes: !!stepData?.scenes,
    scenesLength: stepData?.scenes?.length,
    hasGeneratedVariants: !!stepData?.generatedVariants,
  })

  const [mode, setMode] = useState<"generate" | "upload">("generate")
  const [finalScript, setFinalScript] = useState("")
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [serverAudioUrl, setServerAudioUrl] = useState<string | null>(null)
  const hasRestoredRef = useRef(false)

  // Fetch script history to get active version (optional - may not exist for all project types)
  const { data: scriptData } = useQuery<ScriptData>({
    queryKey: ["/api/projects", projectId, "script-history"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/script-history`, {
        credentials: 'include'
      })
      // Return null if not found - this is expected for own-idea/text/url projects
      if (!res.ok) {
        console.log("[Stage4] No script-history found, will use step 3 data instead")
        return null
      }
      const body = await res.json()
      return body.data ?? body
    },
    retry: false, // Don't retry on failure
  })

  // Determine active version: use candidate if exists, otherwise current
  const currentVersion = scriptData?.currentVersion
  const candidateVersion = scriptData?.versions?.find((v) =>
    v.isCandidate === true || v.is_candidate === true
  )
  const activeVersion = candidateVersion ?? currentVersion

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

  // Load script from Stage 3 data (PRIMARY SOURCE for all project types)
  // This contains the user-selected scene variants from Step3_2_Constructor
  // This effect runs FIRST to establish the finalScript from step 3 data
  useEffect(() => {
    // Skip if already have script (either from previous load or from stage 4 saved data)
    if (finalScript) return

    if (stepData) {
      // Try different data structures from Stage 3:
      // Priority 1: finalScript.scenes - from Step3_2_Constructor completion (user-selected variants!)
      // Priority 2: scenes - legacy format  
      // Priority 3: generatedVariants.scenes - if not completed yet
      // Priority 4: text - raw text
      // Priority 5: sourceContent - original content
      let defaultScript = ""
      let source = ""
      
      // Priority 1: finalScript.scenes (from Step3_2_Constructor - CONTAINS USER-SELECTED VARIANTS)
      if (stepData.finalScript?.scenes?.length > 0) {
        defaultScript = stepData.finalScript.scenes.map((s: any) => s.text).join("\n\n")
        source = "finalScript.scenes (user-selected variants)"
      }
      // Priority 2: Direct scenes array
      else if (stepData.scenes?.length > 0) {
        defaultScript = stepData.scenes.map((s: any) => s.text).join("\n\n")
        source = "scenes"
      }
      // Priority 3: generatedVariants.scenes (work in progress)
      else if (stepData.generatedVariants?.scenes?.length > 0) {
        defaultScript = stepData.generatedVariants.scenes.map((s: any) => s.text).join("\n\n")
        source = "generatedVariants.scenes"
      }
      // Priority 4: Raw text
      else if (stepData.text) {
        defaultScript = stepData.text
        source = "text"
      }
      // Priority 5: sourceContent (original content)
      else if (stepData.sourceContent) {
        defaultScript = stepData.sourceContent
        source = "sourceContent"
      }

      if (defaultScript) {
        console.log("[Stage4] Loading script from step 3 data (" + source + "):", defaultScript.slice(0, 100) + "...")
        setFinalScript(defaultScript)
      }
    }
  }, [stepData, finalScript])

  // Fallback to activeVersion if no step 3 data available
  // This is a fallback for legacy projects that don't have step 3 data
  useEffect(() => {
    if (finalScript) return

    // Only use activeVersion as fallback if no stepData or stepData has no usable content
    const hasStepDataContent = stepData?.finalScript?.scenes?.length > 0 ||
                               stepData?.scenes?.length > 0 ||
                               stepData?.generatedVariants?.scenes?.length > 0 ||
                               stepData?.text ||
                               stepData?.sourceContent

    if (hasStepDataContent) return // Step data should have been loaded by the previous effect

    if (activeVersion?.scenes) {
      const versionScript = activeVersion.scenes.map((s) => s.text).join("\n\n")
      if (versionScript) {
        console.log("[Stage4] Fallback: Loading script from activeVersion:", versionScript.slice(0, 100) + "...")
        setFinalScript(versionScript)
      }
    }
  }, [activeVersion?.id, activeVersion?.scenes, finalScript, stepData])

  // Restore state from Stage 4 saved data (voice, audio, mode)
  // This runs AFTER script loading to restore UI state like selected voice and audio URL
  useEffect(() => {
    const savedStepData = stage4Data?.data as Stage4StepData | undefined
    if (savedStepData && savedStepData.mode && !hasRestoredRef.current) {
      hasRestoredRef.current = true
      setMode(savedStepData.mode)

      if (savedStepData.mode === "generate") {
        // Only restore finalScript if we don't have one from step 3 data
        // (Stage 4 might have an older/edited version, but step 3 data is authoritative)
        if (savedStepData.finalScript && !finalScript) {
          setFinalScript(savedStepData.finalScript)
        }
        if (savedStepData.selectedVoice) setSelectedVoice(savedStepData.selectedVoice)
        if (savedStepData.audioUrl) setServerAudioUrl(savedStepData.audioUrl)
      } else if (savedStepData.mode === "upload") {
        if (savedStepData.audioUrl) {
          setServerAudioUrl(savedStepData.audioUrl)
        }
      }
    }
  }, [stage4Data, finalScript])

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
