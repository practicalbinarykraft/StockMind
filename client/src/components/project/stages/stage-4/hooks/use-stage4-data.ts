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

  // Restore state from Stage 4 saved data
  useEffect(() => {
    const isActiveVersionReady = activeVersion !== undefined ||
                                  (scriptData !== undefined && !activeVersion)

    const savedStepData = stage4Data?.data as Stage4StepData | undefined
    if (savedStepData && savedStepData.mode && !hasRestoredRef.current && isActiveVersionReady) {
      hasRestoredRef.current = true
      setMode(savedStepData.mode)

      if (savedStepData.mode === "generate") {
        if (savedStepData.finalScript) {
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
  }, [stage4Data, activeVersion?.id, scriptData])

  // Update finalScript from active version if no saved data (for news/instagram projects)
  useEffect(() => {
    if (hasRestoredRef.current || finalScript) return

    if (activeVersion?.scenes) {
      const versionScript = activeVersion.scenes.map((s) => s.text).join("\n\n")
      if (versionScript) {
        console.log("[Stage4] Loading script from activeVersion:", versionScript.slice(0, 100) + "...")
        setFinalScript(versionScript)
      }
    }
  }, [activeVersion?.id, activeVersion?.scenes, finalScript])

  // Fallback to Stage 3 data (from Step3_2_Constructor or other sources)
  // This is the primary source for own-idea/text/url projects
  useEffect(() => {
    // Skip if already restored from saved data or have script
    if (hasRestoredRef.current || finalScript) return
    // Skip if activeVersion has scenes (for news/instagram projects)
    if (activeVersion?.scenes && activeVersion.scenes.length > 0) return

    if (stepData) {
      // Try different data structures from Stage 3:
      // 1. finalScript.scenes - from Step3_2_Constructor completion
      // 2. scenes - legacy format
      // 3. generatedVariants.scenes - if not completed yet
      // 4. text - raw text
      let defaultScript = ""
      
      // Priority 1: finalScript.scenes (from Step3_2_Constructor)
      if (stepData.finalScript?.scenes?.length > 0) {
        defaultScript = stepData.finalScript.scenes.map((s: any) => s.text).join("\n\n")
      }
      // Priority 2: Direct scenes array
      else if (stepData.scenes?.length > 0) {
        defaultScript = stepData.scenes.map((s: any) => s.text).join("\n\n")
      }
      // Priority 3: generatedVariants.scenes (work in progress)
      else if (stepData.generatedVariants?.scenes?.length > 0) {
        defaultScript = stepData.generatedVariants.scenes.map((s: any) => s.text).join("\n\n")
      }
      // Priority 4: Raw text
      else if (stepData.text) {
        defaultScript = stepData.text
      }
      // Priority 5: sourceContent (original content)
      else if (stepData.sourceContent) {
        defaultScript = stepData.sourceContent
      }

      if (defaultScript) {
        console.log("[Stage4] Loading script from step 3 data:", defaultScript.slice(0, 100) + "...")
        setFinalScript(defaultScript)
      }
    }
  }, [stepData, finalScript, activeVersion])

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
