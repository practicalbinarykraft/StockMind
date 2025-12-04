import type { Express, Request, Response } from "express"
import { storage } from "../../storage"
import { requireAuth } from "../../middleware/jwt-auth"
import { getUserId } from "../../utils/route-helpers"
import { analyzeScript } from "../../ai-services"
import { ScriptVersionService } from "../../services/script-version-service"
import { extractScoreDelta, priorityToConfidence } from "../../lib/reco-utils"
import { logger } from "../../lib/logger"
import { analyzeHook, analyzeStructure, analyzeEmotionalImpact, analyzeCTA, synthesizeAnalysis } from "../../ai-services"
import { extractProjectContent, FORMAT_NAME_MAP } from "./helpers"

export function registerGenerateScriptRoute(app: Express) {
  app.post("/api/projects/:id/generate-script", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })
      const { formatId, targetLocale = 'ru' } = req.body

      logger.info(`[Generate Script] Request received`, {
        projectId: id,
        formatId,
        targetLocale,
      })

      if (!formatId) {
        return res.status(400).json({ message: "formatId is required" })
      }

      const project = await storage.getProject(id, userId)
      if (!project) return res.status(404).json({ message: "Project not found" })

      const steps = await storage.getProjectSteps(id)
      const step2 = steps.find(s => s.stepNumber === 2)
      const step2Data = step2?.data as any

      const { title, content } = await extractProjectContent(project, step2Data)

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          message: "No content found in project. Please ensure content is available."
        })
      }

      const apiKey = await storage.getUserApiKey(userId, 'anthropic')
      if (!apiKey) {
        return res.status(400).json({
          message: "Anthropic API key not configured. Please add it in Settings."
        })
      }

      const formatName = FORMAT_NAME_MAP[formatId] || formatId

      logger.info(`[Generate Script] Starting script generation`, {
        projectId: id,
        formatId,
        formatName,
        contentLength: content.length,
      })

      const scriptAnalysis = await analyzeScript(
        apiKey.decryptedKey,
        formatName,
        content.substring(0, 5000)
      )

      if (!scriptAnalysis.scenes || scriptAnalysis.scenes.length === 0) {
        return res.status(422).json({
          success: false,
          error: 'AI не смог создать сценарий',
          code: 'NO_SCENES',
          suggestions: [
            'Попробуйте другой формат видео',
            'Упростите исходный контент',
            'Повторите попытку через несколько секунд'
          ],
        })
      }

      const scenes = buildScenesWithTiming(scriptAnalysis.scenes)

      // Multi-Agent Analysis
      logger.info(`[Generate Script] Starting Multi-Agent Analysis`, { projectId: id })

      const scriptText = scenes.map(s => s.text).join('\n')
      const fullScriptContent = `${title || 'Untitled'}\n\n${scriptText}`

      const [hookAnalysis, structureAnalysis, emotionalAnalysis, ctaAnalysis] = await Promise.all([
        analyzeHook(apiKey.decryptedKey, fullScriptContent),
        analyzeStructure(apiKey.decryptedKey, fullScriptContent, {
          scenes: scenes.map(s => ({ text: s.text, duration: s.end - s.start }))
        }),
        analyzeEmotionalImpact(apiKey.decryptedKey, fullScriptContent),
        analyzeCTA(apiKey.decryptedKey, fullScriptContent),
      ])

      const advancedAnalysis = await synthesizeAnalysis(
        apiKey.decryptedKey,
        hookAnalysis,
        structureAnalysis,
        emotionalAnalysis,
        ctaAnalysis,
        'custom_script'
      )

      logger.info(`[Generate Script] Multi-Agent Analysis completed`, {
        projectId: id,
        overallScore: advancedAnalysis.overallScore,
      })

      const recommendationsData = buildRecommendations(
        scriptAnalysis.recommendations,
        advancedAnalysis.recommendations,
        scenes
      )

      const finalScore = Math.max(
        scriptAnalysis.overallScore || 50,
        advancedAnalysis.overallScore || 50
      )

      const scriptVersionService = new ScriptVersionService(storage)
      const newVersion = await scriptVersionService.createVersion({
        projectId: id,
        scenes,
        createdBy: 'system',
        changes: {
          type: 'initial',
          description: `Initial version generated from ${formatName} format`,
        },
        analysisResult: {
          scriptAnalysis,
          advancedAnalysis,
          combinedScore: finalScore,
        },
        analysisScore: finalScore,
        userId,
      })

      if (recommendationsData.length > 0) {
        const recommendations = recommendationsData.map(rec => ({
          ...rec,
          scriptVersionId: newVersion.id,
        }))
        await storage.createSceneRecommendations(recommendations)
      }

      logger.info(`[Generate Script] Script generated successfully`, {
        projectId: id,
        versionId: newVersion.id,
        scenesCount: scenes.length,
        recommendationsCount: recommendationsData.length,
        finalScore,
      })

      res.json({
        success: true,
        data: {
          version: newVersion,
          formatName,
          scenesCount: scenes.length,
          recommendationsCount: recommendationsData.length,
          analysis: {
            scriptScore: scriptAnalysis.overallScore,
            advancedScore: advancedAnalysis.overallScore,
            finalScore,
            verdict: advancedAnalysis.verdict,
            hookScore: advancedAnalysis.hookScore,
            structureScore: advancedAnalysis.structureScore,
            emotionalScore: advancedAnalysis.emotionalScore,
            ctaScore: advancedAnalysis.ctaScore,
            strengths: advancedAnalysis.strengths,
            weaknesses: advancedAnalysis.weaknesses,
          }
        }
      })
    } catch (error: any) {
      logger.error("Error generating script", {
        projectId: id,
        error: error.message,
        code: error.code,
        stack: error.stack,
      })

      if (error.code === 'NO_SCENES') {
        return res.status(422).json({
          success: false,
          error: error.message || 'AI не смог создать сценарий',
          code: 'NO_SCENES',
          suggestions: error.suggestions || [
            'Попробуйте другой формат видео',
            'Повторите попытку',
          ],
        })
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate script"
      })
    }
  })
}

function buildScenesWithTiming(rawScenes: any[]): any[] {
  let currentTime = 0
  return rawScenes.map((scene: any, index: number) => {
    const wordCount = scene.text.split(/\s+/).length
    const estimatedDuration = Math.max(3, Math.min(8, Math.ceil(wordCount / 3)))
    const startTime = currentTime
    const endTime = startTime + estimatedDuration
    currentTime = endTime

    return {
      id: scene.sceneNumber || (index + 1),
      sceneNumber: scene.sceneNumber || (index + 1),
      text: scene.text,
      score: scene.score || 50,
      variants: scene.variants || [],
      start: startTime,
      end: endTime,
    }
  })
}

function buildRecommendations(
  scriptRecommendations: any[] | undefined,
  advancedRecommendations: any[] | undefined,
  scenes: any[]
): any[] {
  const recommendationsData: any[] = []

  if (scriptRecommendations && Array.isArray(scriptRecommendations)) {
    for (const rec of scriptRecommendations) {
      const sceneNumber = rec.sceneNumber
      if (sceneNumber && sceneNumber > 0 && sceneNumber <= scenes.length) {
        recommendationsData.push({
          sceneId: sceneNumber,
          priority: rec.priority || 'medium',
          area: rec.area || 'general',
          currentText: rec.current || '',
          suggestedText: rec.suggested || '',
          reasoning: rec.reasoning || 'Улучшение для повышения вирусности',
          expectedImpact: rec.expectedImpact || '+0 points',
          sourceAgent: rec.area || 'general',
          scoreDelta: extractScoreDelta(rec.expectedImpact),
          confidence: priorityToConfidence(rec.priority),
        })
      }
    }
  }

  if (advancedRecommendations && Array.isArray(advancedRecommendations)) {
    for (const rec of advancedRecommendations) {
      const sceneNumber = rec.sceneNumber ||
        (rec.area === 'hook' ? 1 :
         rec.area === 'cta' ? scenes.length :
         Math.floor(scenes.length / 2))

      if (sceneNumber > 0 && sceneNumber <= scenes.length) {
        const isDuplicate = recommendationsData.some(existing =>
          existing.sceneId === sceneNumber &&
          existing.area === rec.area &&
          existing.priority === rec.priority
        )

        if (!isDuplicate) {
          recommendationsData.push({
            sceneId: sceneNumber,
            priority: rec.priority || 'medium',
            area: rec.area || 'general',
            currentText: rec.current || scenes[sceneNumber - 1]?.text || '',
            suggestedText: rec.suggested || '',
            reasoning: rec.reasoning || 'Улучшение для повышения вирусности',
            expectedImpact: rec.expectedImpact || '+0 points',
            sourceAgent: rec.area || 'general',
            scoreDelta: extractScoreDelta(rec.expectedImpact),
            confidence: priorityToConfidence(rec.priority),
          })
        }
      }
    }
  }

  return recommendationsData
}
