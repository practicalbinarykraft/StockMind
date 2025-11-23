import { apiRequest } from "@/lib/query-client"
import { type AIAnalysis } from "../types/analysis-types"

/**
 * Get the current text for a scene (edited, variant, or original)
 */
export const getSceneText = (
  scene: AIAnalysis['scenes'][0],
  editedScenes: Record<number, string>,
  selectedVariants: Record<number, number>
) => {
  if (editedScenes[scene.id]) return editedScenes[scene.id]
  if (selectedVariants[scene.id] !== undefined) {
    return scene.variants[selectedVariants[scene.id]]
  }
  return scene.text
}

/**
 * Get the current score for a scene (original or variant score)
 */
export const getSceneScore = (
  scene: AIAnalysis['scenes'][0],
  editedScenes: Record<number, string>,
  selectedVariants: Record<number, number>,
  variantScores: Record<string, number>
) => {
  // If scene is edited, can't show accurate score
  if (editedScenes[scene.id]) return scene.score

  // If variant is selected, use variant score
  if (selectedVariants[scene.id] !== undefined) {
    const scoreKey = `${scene.id}-${selectedVariants[scene.id]}`
    return variantScores[scoreKey] ?? scene.score // fallback to original if not scored yet
  }

  // Original text, use original score
  return scene.score
}

/**
 * Handle variant change and auto-save cache
 */
export const handleVariantChange = async (
  sceneId: number,
  variantValue: string,
  scene: AIAnalysis['scenes'][0],
  selectedVariants: Record<number, number>,
  variantScores: Record<string, number>,
  setSelectedVariants: (variants: Record<number, number>) => void,
  setVariantScores: (scores: Record<string, number>) => void,
  setScoringVariant: (variant: string | null) => void,
  scoreVariantMutation: any,
  autoSaveCache: (variants: Record<number, number>, scores: Record<string, number>) => Promise<void>,
  toast: any
) => {
  if (variantValue === "original") {
    // Switch to original - remove from selectedVariants
    const newVariants = { ...selectedVariants }
    delete newVariants[sceneId]
    setSelectedVariants(newVariants)

    // Auto-save with updated variants
    await autoSaveCache(newVariants, variantScores)
  } else {
    const variantIdx = parseInt(variantValue)
    const newVariants = { ...selectedVariants, [sceneId]: variantIdx }
    setSelectedVariants(newVariants)

    // Check if we already have score for this variant
    const scoreKey = `${sceneId}-${variantIdx}`
    if (variantScores[scoreKey] === undefined) {
      // Need to score this variant
      const variantText = scene.variants[variantIdx]
      setScoringVariant(scoreKey)

      try {
        const result = await scoreVariantMutation.mutateAsync({ text: variantText })
        const newScores = { ...variantScores, [scoreKey]: result.score }
        setVariantScores(newScores)

        // Auto-save with updated variants AND scores
        await autoSaveCache(newVariants, newScores)
      } catch (error) {
        console.error('Failed to score variant:', error)
        toast({
          variant: "destructive",
          title: "Scoring Failed",
          description: "Could not calculate score for this variant",
        })
      } finally {
        setScoringVariant(null)
      }
    } else {
      // Variant already scored, just auto-save selection
      await autoSaveCache(newVariants, variantScores)
    }
  }
}

/**
 * Auto-save cache helper - accepts fresh values to avoid stale state
 */
export const autoSaveCache = async (
  projectId: string,
  selectedFormat: string,
  freshVariants: Record<number, number>,
  editedScenes: Record<number, string>,
  freshScores: Record<string, number>,
  analysis: AIAnalysis | null
) => {
  if (!analysis) return

  try {
    await apiRequest("POST", `/api/projects/${projectId}/steps`, {
      stepNumber: 3,
      data: {
        selectedFormat,
        selectedVariants: freshVariants,
        editedScenes,
        variantScores: freshScores,
        overallScore: analysis.overallScore,
        overallComment: analysis.overallComment,
        scenes: analysis.scenes
      }
    })
    console.log("✅ Auto-saved:", { variants: freshVariants, scores: freshScores })
  } catch (error) {
    console.error("Failed to auto-save:", error)
  }
}
