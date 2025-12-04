import type { Express, Request, Response } from "express"
import { storage } from "../../storage"
import { requireAuth } from "../../middleware/jwt-auth"
import { getUserId } from "../../utils/route-helpers"
import { scoreNewsAdvanced } from "../../ai-services/advanced"
import { logger } from "../../lib/logger"
import { extractProjectContent, getRecommendedFormat } from "./helpers"

export function registerAnalyzeSourceRoute(app: Express) {
  app.post("/api/projects/:id/analyze-source", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params

    try {
      const userId = getUserId(req)
      if (!userId) return res.status(401).json({ message: "Unauthorized" })

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

      const hasCyrillic = /[а-яА-ЯёЁ]/.test(content)
      const language = hasCyrillic ? 'ru' : 'en'

      logger.info(`[Analyze Source] Starting analysis for project ${id}`, {
        projectId: id,
        sourceType: project.sourceType,
        contentLength: content.length,
      })

      let analysisResult: any = null

      // Check for existing analysis from News Hub
      if (project.sourceType === 'news' && project.sourceData) {
        const sourceData = project.sourceData as any
        const items = await storage.getRssItems(userId)
        const newsItem = items.find(i => i.id === sourceData.itemId)

        if (newsItem?.articleAnalysis) {
          logger.info(`[Analyze Source] Using existing articleAnalysis from news item ${sourceData.itemId}`)
          const articleAnalysis = typeof newsItem.articleAnalysis === 'string'
            ? JSON.parse(newsItem.articleAnalysis)
            : newsItem.articleAnalysis

          analysisResult = {
            overallScore: articleAnalysis.score || 0,
            score: articleAnalysis.score || 0,
            strengths: articleAnalysis.strengths || [],
            weaknesses: articleAnalysis.weaknesses || [],
            topics: [],
            sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
            keywords: [],
            risks: articleAnalysis.weaknesses || [],
            verdict: articleAnalysis.verdict || 'moderate',
            breakdown: articleAnalysis.breakdown || {}
          }
        }
      }

      if (!analysisResult) {
        if (project.sourceType === 'news') {
          logger.info(`[Analyze Source] Running analyzeArticlePotential() for project ${id}`)
          const { analyzeArticlePotential } = await import('../../ai-services/analyze-article-potential')
          const articleAnalysis = await analyzeArticlePotential(
            apiKey.decryptedKey,
            title || 'Untitled',
            content.substring(0, 5000)
          )

          analysisResult = {
            overallScore: articleAnalysis.score || 0,
            score: articleAnalysis.score || 0,
            strengths: articleAnalysis.strengths || [],
            weaknesses: articleAnalysis.weaknesses || [],
            topics: [],
            sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
            keywords: [],
            risks: articleAnalysis.weaknesses || [],
            verdict: articleAnalysis.verdict || 'moderate',
            breakdown: articleAnalysis.breakdown || {}
          }
        } else {
          logger.info(`[Analyze Source] Using scoreNewsAdvanced() for ${project.sourceType} source`)
          analysisResult = await scoreNewsAdvanced(
            apiKey.decryptedKey,
            title || 'Untitled',
            content.substring(0, 5000)
          )
        }
      }

      const recommendedFormat = getRecommendedFormat(analysisResult)

      const analysis = {
        score: analysisResult.overallScore,
        verdict: analysisResult.verdict,
        strengths: analysisResult.strengths || [],
        weaknesses: analysisResult.weaknesses || [],
        topics: analysisResult.breakdown?.structure?.topics || [],
        sentiment: analysisResult.breakdown?.emotional?.sentiment || 'neutral',
        keywords: analysisResult.breakdown?.structure?.keywords || [],
        viralPotential: analysisResult.verdict === 'viral' ? 'High' :
                        analysisResult.verdict === 'strong' ? 'Medium-High' :
                        analysisResult.verdict === 'moderate' ? 'Medium' : 'Low',
      }

      const response = {
        success: true,
        data: {
          analysis,
          recommendedFormat,
          sourceMetadata: {
            language,
            wordCount: content.split(/\s+/).filter(Boolean).length,
            characterCount: content.length,
          },
          metadata: {
            analysisTime: Date.now(),
            sourceType: project.sourceType,
          }
        }
      }

      // Save to step 3 data
      const existingStep3 = steps.find(s => s.stepNumber === 3)
      if (existingStep3) {
        await storage.updateProjectStep(existingStep3.id, {
          data: {
            ...(existingStep3.data as any || {}),
            sourceAnalysis: analysis,
            recommendedFormat,
            sourceMetadata: response.data.sourceMetadata,
            metadata: response.data.metadata,
          }
        })
      } else {
        await storage.createProjectStep({
          projectId: id,
          stepNumber: 3,
          data: {
            sourceAnalysis: analysis,
            recommendedFormat,
            sourceMetadata: response.data.sourceMetadata,
            metadata: response.data.metadata,
          }
        })
      }

      res.json(response)
    } catch (error: any) {
      logger.error("Error analyzing source", {
        projectId: id,
        error: error.message,
        stack: error.stack,
      })
      res.status(500).json({
        message: error.message || "Failed to analyze source content"
      })
    }
  })
}
