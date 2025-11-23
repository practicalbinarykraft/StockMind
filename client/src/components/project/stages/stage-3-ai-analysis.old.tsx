import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { type Project } from "@shared/schema"
import { type AdvancedScoreResult } from "@shared/advanced-analysis-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/score-badge"
import { AdvancedAnalysisDisplay } from "@/components/project/advanced-analysis-display"
import { SceneEditor } from "@/components/project/scene-editor"
import { SourceSummaryBar } from "../source-summary-bar"
import { SourceAnalysisCard } from "../source-analysis-card"
import { RecommendedFormatBox } from "../recommended-format-box"
import { CompareModal } from "../compare-modal"
import { ReanalysisProgressCard } from "../reanalysis-progress-card"
import { Sparkles, FileText, Edit2, Loader2, AlertCircle, DollarSign, Zap, Languages, GitCompareArrows, CheckCircle, X, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Stage3Props {
  project: Project
  stepData: any  // Stage 2 content data
  step3Data?: any  // Stage 3 cached analysis results
}

// Format templates (15 total)
const FORMAT_TEMPLATES = [
  { id: "hook", name: "Hook & Story", description: "Attention-grabbing opening with narrative arc" },
  { id: "explainer", name: "Explainer", description: "Educational breakdown of complex topics" },
  { id: "news", name: "News Update", description: "Professional news report format" },
  { id: "tutorial", name: "Tutorial", description: "Step-by-step instructional guide" },
  { id: "listicle", name: "Top 5 List", description: "Numbered countdown format" },
  { id: "comparison", name: "Before/After", description: "Contrast and comparison structure" },
  { id: "controversy", name: "Hot Take", description: "Provocative opinion piece" },
  { id: "question", name: "Q&A Format", description: "Question-driven narrative" },
  { id: "story", name: "Story Time", description: "Personal narrative storytelling" },
  { id: "reaction", name: "Reaction Video", description: "Commentary on current events" },
  { id: "challenge", name: "Challenge", description: "Call to action format" },
  { id: "trends", name: "Trend Analysis", description: "Exploring what's viral now" },
  { id: "myth", name: "Myth Buster", description: "Debunking false beliefs" },
  { id: "prediction", name: "Future Forecast", description: "Predictions and implications" },
  { id: "case", name: "Case Study", description: "Deep dive into specific example" },
]

interface AIAnalysis {
  format: string
  overallScore: number
  overallComment: string
  scenes: Array<{
    id: number
    text: string
    score: number
    variants: string[]
  }>
}

export function Stage3AIAnalysis({ project, stepData, step3Data }: Stage3Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [reanalyzeJobId, setReanalyzeJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedScoreResult | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'advanced'>('advanced') // Default to advanced
  const [selectedFormat, setSelectedFormat] = useState<string>("news")
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({})
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false)
  const [recoveryError, setRecoveryError] = useState<any>(null)
  const [failedFormatId, setFailedFormatId] = useState<string | null>(null)
  const [editedScenes, setEditedScenes] = useState<Record<number, string>>({})
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [reanalyzeDialogOpen, setReanalyzeDialogOpen] = useState(false)
  const [variantScores, setVariantScores] = useState<Record<string, number>>({}) // sceneId-variantIdx -> score
  const [scoringVariant, setScoringVariant] = useState<string | null>(null) // "sceneId-variantIdx" during scoring
  const [analysisTime, setAnalysisTime] = useState<number | undefined>(undefined)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState<'ru' | 'en'>('ru') // Default to Russian
  const { toast} = useToast()
  
  // Store polling timers for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store last submitted scenes/fullScript for retries
  const lastSubmittedPayload = useRef<{ scenes: any[]; fullScript: string } | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, []);

  // Restore polling after page reload
  useEffect(() => {
    const savedJobId = localStorage.getItem('reanalyzeJobId');
    const savedProjectId = localStorage.getItem('reanalyzeProjectId');
    const savedPayload = localStorage.getItem('reanalyzePayload');
    const savedPayloadProjectId = localStorage.getItem('reanalyzePayloadProjectId');
    
    // Restore payload if it matches current project
    if (savedPayload && savedPayloadProjectId === project.id) {
      try {
        lastSubmittedPayload.current = JSON.parse(savedPayload);
      } catch (err) {
        console.error('[Reanalyze] Failed to restore payload:', err);
      }
    }
    
    if (savedJobId && savedProjectId === project.id && !reanalyzeJobId) {
      console.log('[Reanalyze] Восстанавливаем поллинг для job:', savedJobId);
      setReanalyzeJobId(savedJobId);
      setJobStatus({ status: 'running', progress: 50 });
      
      // Resume polling
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}/reanalyze/status?jobId=${savedJobId}`);
          const json = await res.json();
          const status = json?.data ?? json;
          
          setJobStatus(status);

          if (status.status === 'done') {
            clearInterval(interval);
            setReanalyzeJobId(null);
            setJobStatus(null);
            localStorage.removeItem('reanalyzeJobId');
            localStorage.removeItem('reanalyzeProjectId');
            localStorage.removeItem('reanalyzePayload');
            localStorage.removeItem('reanalyzePayloadProjectId');
            
            toast({
              title: "Новая версия готова",
              description: "Теперь можно открыть сравнение",
              action: (
                <ToastAction altText="Открыть сравнение" onClick={() => setCompareOpen(true)}>
                  Открыть
                </ToastAction>
              )
            });
            queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'script-history'], exact: false });
          } else if (status.status === 'error') {
            clearInterval(interval);
            setReanalyzeJobId(null);
            localStorage.removeItem('reanalyzeJobId');
            localStorage.removeItem('reanalyzeProjectId');
            
            toast({
              title: "Ошибка анализа",
              description: status.error || "Произошла ошибка",
              variant: "destructive"
            });
          }
        } catch (err) {
          console.error('[Reanalyze] Polling error:', err);
        }
      }, 2000);

      // No hard timeout - poll until job reaches final status (done/error)
      // The server has a 120-second timeout that will set status to 'error' if exceeded

      // Cleanup on unmount
      return () => {
        clearInterval(interval);
      };
    }
  }, [project.id]);

  // Feature flag check
  const STAGE3_MAGIC_UI = import.meta.env.VITE_STAGE3_MAGIC_UI === 'true'
  
  // Query to check if script exists (using /script-history as single source of truth)
  const scriptVersionsQuery = useQuery({
    queryKey: ['/api/projects', project.id, 'script-history'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/script-history`)
      if (!res.ok) return { currentVersion: null, versions: [], recommendations: [] }
      const response = await res.json()
      // Unwrap new API format: { success: true, data: {...} }
      return response.data || response
    },
    enabled: Boolean(project.id), // Always enabled if we have project ID
    staleTime: 5000
  })
  
  // Detect if script exists - check both currentVersion and versions array
  const hasScript = Boolean(
    scriptVersionsQuery.data?.currentVersion || 
    (scriptVersionsQuery.data?.versions && scriptVersionsQuery.data.versions.length > 0)
  )

  // Check if there's a candidate version for comparison
  // API returns camelCase (isCandidate) after Drizzle ORM transformation
  const versions = scriptVersionsQuery.data?.versions || [];
  const hasCandidate = versions.some((v: any) => 
    v.isCandidate === true || v.is_candidate === true
  );

  // Extract current and candidate version IDs for new compare endpoint
  const currentVersion = scriptVersionsQuery.data?.currentVersion;
  const candidateVersion = versions.find((v: any) => 
    v.isCandidate === true || v.is_candidate === true
  );

  // Open compare modal handler - opens immediately, shows loading if job running
  const handleOpenCompare = () => {
    console.log('[Compare] Click - hasCandidate:', hasCandidate, 'jobRunning:', !!reanalyzeJobId);
    setCompareOpen(true);
  };

  // Reanalyze mutation - starts async job (saves new version + auto-analyze)
  const reanalyzeMutation = useMutation({
    mutationFn: async ({ scenes, fullScript }: { scenes: any[]; fullScript: string }) => {
      // Save payload for retries (both in-memory and localStorage)
      lastSubmittedPayload.current = { scenes, fullScript };
      localStorage.setItem('reanalyzePayload', JSON.stringify({ scenes, fullScript }));
      localStorage.setItem('reanalyzePayloadProjectId', project.id);
      
      const idempotencyKey = `version-${project.id}-${Date.now()}`;
      
      const res = await apiRequest('POST', `/api/projects/${project.id}/versions`, {
        scenes,
        fullScript,
        idempotencyKey
      });
      
      // Handle 409 - job already running
      if (res.status === 409) {
        const json = await res.json();
        // Return the existing job info so we can resume polling
        return { jobId: json.jobId, alreadyRunning: true };
      }
      
      const json = await res.json();
      const data = json?.data ?? json;
      return data;
    },
    onSuccess: (data: any) => {
      const jobId = data.jobId;
      setReanalyzeJobId(jobId);
      setJobStatus({ status: 'queued', progress: 0 });
      
      // 🔥 CRITICAL: Invalidate cache IMMEDIATELY after candidate created
      // Don't wait for analysis to complete - user should see their edits right away
      // exact: false to match all activeVersionId variants
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'script-history'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'scene-recommendations'], exact: false });
      
      if (data.alreadyRunning) {
        toast({
          title: "Версия уже создаётся",
          description: "Продолжаем отслеживать прогресс",
        });
      } else {
        toast({
          title: "Создаём новую версию",
          description: "Создаём версию… ~10–60 сек",
        });
      }

      // Save jobId to localStorage for recovery
      localStorage.setItem('reanalyzeJobId', jobId);
      localStorage.setItem('reanalyzeProjectId', project.id);
      
      // Auto-open compare modal to show progress
      setCompareOpen(true);

      // Clear any existing polling timers
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);

      // Start polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${project.id}/reanalyze/status?jobId=${jobId}`);
          const json = await res.json();
          const status = json?.data ?? json;
          
          setJobStatus(status);

          if (status.status === 'done') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
            setReanalyzeJobId(null);
            setJobStatus(null);
            localStorage.removeItem('reanalyzeJobId');
            localStorage.removeItem('reanalyzeProjectId');
            localStorage.removeItem('reanalyzePayload');
            localStorage.removeItem('reanalyzePayloadProjectId');
            
            toast({
              title: "Новая версия готова",
              description: "Теперь можно открыть сравнение",
              action: (
                <ToastAction altText="Открыть сравнение" onClick={() => setCompareOpen(true)}>
                  Открыть
                </ToastAction>
              )
            });
            queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'script-history'], exact: false });
          } else if (status.status === 'error') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
            setReanalyzeJobId(null);
            localStorage.removeItem('reanalyzeJobId');
            localStorage.removeItem('reanalyzeProjectId');
            
            toast({
              title: "Ошибка анализа",
              description: status.error || "Произошла ошибка",
              variant: "destructive"
            });
          }
        } catch (err) {
          console.error('[Reanalyze] Polling error:', err);
        }
      }, 2000); // Poll every 2s

      // No hard timeout - poll until job reaches final status (done/error)
      // The server has a 120-second timeout that will set status to 'error' if exceeded
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка запуска анализа",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Accept candidate version mutation
  const acceptMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest('PUT', `/api/projects/${project.id}/versions/${versionId}/accept`, {});
      const response = await res.json();
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'script-history'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'scene-recommendations'], exact: false });
      setCompareOpen(false);
      toast({
        title: "Версия принята",
        description: "Новая версия теперь текущая",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка принятия",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reject (delete) candidate version mutation
  const rejectMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${project.id}/versions/${versionId}`, {});
      const response = await res.json();
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'script-history'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'scene-recommendations'], exact: false });
      setCompareOpen(false);
      toast({
        title: "Версия отклонена",
        description: "Кандидат удалён",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive"
      });
    }
  });


  // Get content from step data
  // - Custom scripts: stepData.text
  // - News: stepData.content
  // - Instagram: stepData.transcription
  const content = stepData?.content || stepData?.text || stepData?.transcription || ""

  // State for manual analysis trigger
  const [shouldAnalyze, setShouldAnalyze] = useState(false)

  // Query for source analysis (only in source review mode - MANUAL TRIGGER)
  const sourceAnalysisQuery = useQuery({
    queryKey: ['/api/projects', project.id, 'analyze-source'],
    queryFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${project.id}/analyze-source`, {})
      const response = await res.json()
      // Unwrap new API format: { success: true, data: {...} }
      return response.data || response
    },
    enabled: !hasScript && shouldAnalyze && Boolean(project.id),
    staleTime: Infinity
  })

  // Manual trigger for source analysis
  const handleStartAnalysis = () => {
    setShouldAnalyze(true)
  }

  // Source data extraction for source review mode
  const sourceData = {
    type: project.sourceType as 'news' | 'instagram' | 'custom',
    score: stepData?.aiScore,
    language: sourceAnalysisQuery.data?.sourceMetadata?.language || 'unknown',
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title: stepData?.title || project.title || 'Untitled',
    content: content
  }

  // Generate script mutation (for source review mode) - calls new unified endpoint
  const generateMutation = useMutation({
    mutationFn: async (formatId: string) => {
      // Generate idempotency key to prevent double-click issues
      const idempotencyKey = `${project.id}:${formatId}:${Date.now()}`
      
      const res = await apiRequest("POST", `/api/projects/${project.id}/generate-script`, {
        formatId,
        targetLocale: targetLanguage, // Use selected language
        idempotencyKey
      })
      const response = await res.json()
      // Return as-is (already in correct format with success: true)
      return response
    },
    onSuccess: async (data) => {
      // Invalidate and immediately refetch to trigger UI switch (exact: false to match all variants)
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "script-history"], exact: false })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "scene-recommendations"], exact: false })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id], exact: false })
      
      // Force immediate refetch to update hasScript state
      await scriptVersionsQuery.refetch()

      // Auto-scroll to scene editor after short delay
      setTimeout(() => {
        const sceneEditor = document.querySelector('[data-testid="scene-editor"]')
        if (sceneEditor) {
          sceneEditor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)

      const scenesCount = data.version?.scenes?.length || 0
      toast({
        title: "Сценарий создан",
        description: `Создано ${scenesCount} сцен • Формат: ${data.formatName || 'Hook & Story'}. Редактор сцен загружается...`,
      })
    },
    onError: async (error: any, formatId: string) => {
      console.error('[Generate Script Error]:', error);
      
      // Try to parse JSON from error message (format: "422: {json}")
      let errorData: any = null;
      try {
        const match = error.message?.match(/^\d+:\s*(\{[\s\S]*\})$/);
        if (match) {
          errorData = JSON.parse(match[1]);
        }
      } catch (e) {
        console.warn('[Generate Script] Could not parse error JSON:', e);
      }
      
      // Check if this is a NO_SCENES error (422)
      const isNoScenesError = 
        errorData?.code === 'NO_SCENES' ||
        error.message?.includes('NO_SCENES') ||
        error.message?.includes('не смог создать сцен') ||
        error.message?.includes('422');
      
      if (isNoScenesError) {
        console.log('[Generate Script] NO_SCENES error detected, showing Recovery modal');
        // Show Recovery modal with structured data
        setRecoveryError({
          message: errorData?.message || error.message || 'AI не смог создать сценарий',
          suggestions: errorData?.suggestions || [
            'Попробуйте другой формат видео',
            'Повторите попытку',
          ],
          code: 'NO_SCENES',
        });
        setFailedFormatId(formatId);
        setRecoveryModalOpen(true);
        return;
      }
      
      // Default error handling for other errors
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось создать скрипт",
        variant: "destructive"
      })
    }
  })

  // Handle generate script (for source review mode)
  const handleGenerateScript = (formatId: string) => {
    generateMutation.mutate(formatId)
  }

  // Determine which advanced endpoint to use based on sourceType
  const getAdvancedEndpoint = () => {
    switch (project.sourceType) {
      case 'news':
        return '/api/analyze/advanced/news'
      case 'instagram':
        return '/api/analyze/advanced/reel'
      case 'custom':
      default:
        return '/api/analyze/advanced/script'
    }
  }

  // Prepare request body for advanced analysis
  const getAdvancedRequestBody = () => {
    switch (project.sourceType) {
      case 'news':
        return {
          title: stepData?.title || project.title || 'Untitled',
          content: stepData?.content || content
        }
      case 'instagram':
        return {
          transcription: stepData?.transcription || content,
          caption: stepData?.caption || null
        }
      case 'custom':
      default:
        return {
          text: stepData?.text || content,
          format: selectedFormat || 'short-form',
          scenes: stepData?.scenes || null
        }
    }
  }

  // Advanced analysis mutation
  const advancedAnalyzeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = getAdvancedEndpoint()
      const body = getAdvancedRequestBody()
      
      const res = await apiRequest("POST", endpoint, body)
      return await res.json()
    },
    onSuccess: (data) => {
      setAdvancedAnalysis(data)
      setAnalysisTime(data.metadata?.analysisTime)
      
      // Save to cache
      apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          analysisMode: 'advanced',
          advancedAnalysis: data,
          analysisTime: data.metadata?.analysisTime,
          selectedFormat
        }
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      }).catch(err => {
        console.error("Failed to cache advanced analysis:", err)
      })

      // Create initial script version if scenes exist
      if (data.scenes && data.scenes.length > 0) {
        apiRequest("POST", `/api/projects/${project.id}/create-initial-version`, {
          scenes: data.scenes,
          analysisResult: data,
          analysisScore: data.overallScore
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "script-history"], exact: false })
          queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "scene-recommendations"], exact: false })
        }).catch(err => {
          console.error("Failed to create initial version:", err)
        })
      }
    },
  })

  // Simple/legacy analysis mutation (kept for backward compatibility)
  const analyzeMutation = useMutation({
    mutationFn: async (format: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-script", { format, content })
      return await res.json()
    },
    onSuccess: (data) => {
      setAnalysis(data)
      setSelectedFormat(data.format)
      
      // Save to cache immediately with fresh data (don't rely on state!)
      apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          analysisMode: 'simple',
          selectedFormat: data.format,
          selectedVariants: {},
          editedScenes: {},
          overallScore: data.overallScore,
          overallComment: data.overallComment,
          scenes: data.scenes
        }
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      }).catch(err => {
        console.error("Failed to cache analysis:", err)
      })
    },
    onError: (error: any) => {
      // apiRequest throws Error with message format: "404: text" or "500: text"
      const statusMatch = error?.message?.match(/^(\d{3}):/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
      const is404 = statusCode === 404 || error?.status === 404;
      
      toast({
        title: 'Ошибка анализа',
        description: is404 
          ? 'Legacy-анализ недоступен. Используйте Advanced Analyze для более детального анализа скрипта.'
          : error.message || 'Не удалось выполнить анализ скрипта',
        variant: 'destructive',
      });
    },
  })

  // Score variant mutation
  const scoreVariantMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      const res = await apiRequest("POST", "/api/ai/score-text", { text })
      return await res.json()
    },
  })

  // Load cached analysis from step3Data on mount
  useEffect(() => {
    // CHECK CACHE FIRST! Don't call AI if we have cached data
    // step3Data contains cached analysis results from previous runs
    if (step3Data?.sourceAnalysis && step3Data?.recommendedFormat) {
      // Load source analysis from cache (new format - from analyze-source endpoint)
      console.log('[Stage 3] ✅ Loading source analysis from cache (step3Data.sourceAnalysis)')
      
      // Populate TanStack Query cache to prevent re-fetching
      queryClient.setQueryData(['/api/projects', project.id, 'analyze-source'], {
        analysis: step3Data.sourceAnalysis,
        recommendedFormat: step3Data.recommendedFormat,
        sourceMetadata: step3Data.sourceMetadata,
        metadata: step3Data.metadata || {}
      })
      
      setShouldAnalyze(true) // Mark as analyzed
    } else if (step3Data?.advancedAnalysis) {
      // Load advanced analysis from cache
      console.log('[Stage 3] ✅ Loading advanced analysis from cache (step3Data)')
      setAdvancedAnalysis(step3Data.advancedAnalysis)
      setAnalysisMode('advanced')
      setAnalysisTime(step3Data.analysisTime)
      setSelectedFormat(step3Data.selectedFormat || 'news')
    } else if (step3Data?.scenes && step3Data?.overallScore !== undefined) {
      // Load simple analysis from cache (legacy)
      console.log('[Stage 3] ✅ Loading simple analysis from cache (step3Data)')
      setAnalysis({
        format: step3Data.selectedFormat || 'news',
        overallScore: step3Data.overallScore,
        overallComment: step3Data.overallComment || '',
        scenes: step3Data.scenes
      })
      setAnalysisMode('simple')
      setSelectedFormat(step3Data.selectedFormat || 'news')
      setSelectedVariants(step3Data.selectedVariants || {})
      setEditedScenes(step3Data.editedScenes || {})
      setVariantScores(step3Data.variantScores || {})
    } else {
      console.log('[Stage 3] ℹ️ No cached analysis found - user must click "Analyze Content"')
    }
    // ❌ REMOVED AUTOMATIC ANALYSIS TRIGGER!
    // User must click "Start Analysis" button if no cache exists
    // This prevents unnecessary API calls every time project is opened
  }, [step3Data])

  const handleAnalyze = () => {
    // If analysis already exists (from cache), show cost warning
    if (advancedAnalysis || analysis) {
      setReanalyzeDialogOpen(true)
    } else {
      // Use advanced mode by default
      if (analysisMode === 'advanced') {
        advancedAnalyzeMutation.mutate()
      } else {
        analyzeMutation.mutate(selectedFormat)
      }
    }
  }

  const confirmReanalyze = () => {
    setReanalyzeDialogOpen(false)
    // Use current analysis mode
    if (analysisMode === 'advanced') {
      advancedAnalyzeMutation.mutate()
    } else {
      analyzeMutation.mutate(selectedFormat)
    }
  }

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async () => {
      // Save data based on current analysis mode
      const dataToSave = analysisMode === 'advanced' 
        ? {
            analysisMode: 'advanced',
            advancedAnalysis,
            analysisTime,
            selectedFormat
          }
        : {
            analysisMode: 'simple',
            selectedFormat,
            selectedVariants,
            editedScenes,
            variantScores,
            overallScore: analysis?.overallScore,
            overallComment: analysis?.overallComment,
            scenes: analysis?.scenes
          }
      
      return await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: dataToSave
      })
    }
  })

  // Update project stage mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 4
      })
    },
    onSuccess: async () => {
      // Invalidate and wait for refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      
      toast({
        title: "Analysis Saved",
        description: "Moving to Voice Generation...",
      })
    }
  })

  const handleProceed = async () => {
    // For STAGE3_MAGIC_UI: check activeVersion (candidate or current) metrics
    // For old UI: check global advancedAnalysis/analysis states
    if (STAGE3_MAGIC_UI && hasScript) {
      const current = scriptVersionsQuery.data?.currentVersion;
      const candidate = candidateVersion;
      const activeVersion = candidate ?? current;
      
      // Soft warning if analysis pending, but allow proceeding
      if (activeVersion && !activeVersion.metrics && reanalyzeJobId) {
        toast({
          title: "Анализ ещё выполняется",
          description: "Можно продолжить озвучку сейчас, анализ завершится в фоне.",
        });
        // Continue anyway - don't block
      }
    } else {
      // Old UI logic: check global states
      if (!advancedAnalysis && !analysis) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please complete the analysis first",
        });
        return;
      }
    }

    try {
      // Save step data first
      await saveStepMutation.mutateAsync()
      // Then update project stage (which will trigger navigation via refetch)
      await updateProjectMutation.mutateAsync()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save and proceed",
      })
    }
  }

  const getSceneText = (scene: AIAnalysis['scenes'][0]) => {
    if (editedScenes[scene.id]) return editedScenes[scene.id]
    if (selectedVariants[scene.id] !== undefined) {
      return scene.variants[selectedVariants[scene.id]]
    }
    return scene.text
  }

  const getSceneScore = (scene: AIAnalysis['scenes'][0]) => {
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

  const handleVariantChange = async (sceneId: number, variantValue: string, scene: AIAnalysis['scenes'][0]) => {
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

  // Auto-save cache helper - accepts fresh values to avoid stale state
  const autoSaveCache = async (
    freshVariants: Record<number, number>,
    freshScores: Record<string, number>
  ) => {
    if (!analysis) return
    
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
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

  // MODE 1: Source review mode (STAGE3_MAGIC_UI enabled, no script yet)
  if (STAGE3_MAGIC_UI && !hasScript) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Анализ исходника</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Просмотрите анализ и выберите формат для создания сценария
          </p>
        </div>

        <div className="space-y-4">
          <SourceSummaryBar source={sourceData} projectId={project.id} />
          
          {/* Manual trigger button - show if analysis not started */}
          {!shouldAnalyze && !sourceAnalysisQuery.data && !sourceAnalysisQuery.isLoading && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Готовы к анализу?</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      AI проанализирует исходник и порекомендует оптимальный формат для создания вирусного видео
                    </p>
                  </div>
                  <Button 
                    onClick={handleStartAnalysis}
                    size="lg"
                    className="gap-2"
                    data-testid="button-start-analysis"
                  >
                    <Sparkles className="h-4 w-4" />
                    Начать анализ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {sourceAnalysisQuery.isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Анализируем исходник...</p>
                  <p className="text-sm text-muted-foreground">Это займет несколько секунд</p>
                </div>
              </CardContent>
            </Card>
          )}

          {sourceAnalysisQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(sourceAnalysisQuery.error as any)?.message || "Не удалось проанализировать исходник"}
              </AlertDescription>
            </Alert>
          )}
          
          {sourceAnalysisQuery.data && (
            <>
              <SourceAnalysisCard analysis={sourceAnalysisQuery.data.analysis} />
              
              {/* Language Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Languages className="h-5 w-5" />
                    Язык сценария
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      variant={targetLanguage === 'ru' ? 'default' : 'outline'}
                      onClick={() => setTargetLanguage('ru')}
                      className="flex-1"
                      data-testid="button-lang-ru"
                    >
                      Русский (RU)
                    </Button>
                    <Button
                      variant={targetLanguage === 'en' ? 'default' : 'outline'}
                      onClick={() => setTargetLanguage('en')}
                      className="flex-1"
                      data-testid="button-lang-en"
                    >
                      English (EN)
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Выбранный язык: <strong>{targetLanguage === 'ru' ? 'Русский' : 'English'}</strong>
                  </p>
                </CardContent>
              </Card>
              
              <RecommendedFormatBox 
                recommendation={sourceAnalysisQuery.data.recommendedFormat}
                onApply={handleGenerateScript}
                onChooseOther={() => setShowFormatModal(true)}
                isLoading={generateMutation.isPending}
              />
            </>
          )}

          {generateMutation.isPending && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Генерируем сценарий...</p>
                  <p className="text-sm text-muted-foreground">Многоагентный AI анализ в процессе</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Format Selection Modal */}
        <Dialog open={showFormatModal} onOpenChange={setShowFormatModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Выберите формат</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {FORMAT_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className="p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate border-border"
                  onClick={() => {
                    handleGenerateScript(template.id)
                    setShowFormatModal(false)
                  }}
                  data-testid={`template-${template.id}`}
                >
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Compare Modal */}
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          projectId={project.id}
          reanalyzeJobId={reanalyzeJobId}
          jobStatus={jobStatus}
          onNavigateToVoice={handleProceed}
        />
      </div>
    )
  }

  // MODE 2: Scene editor mode (STAGE3_MAGIC_UI enabled, script exists)
  if (STAGE3_MAGIC_UI && hasScript) {
    const current = scriptVersionsQuery.data?.currentVersion
    const candidate = candidateVersion
    
    // Show candidate if it exists (user just saved it), otherwise show current
    const versionToRender = candidate ?? current
    
    // Extend sourceData with script language for Scene Editor mode
    const editorSourceData = {
      ...sourceData,
      scriptLanguage: versionToRender?.scriptLanguage || targetLanguage || 'ru'
    }
    
    if (scriptVersionsQuery.isLoading) {
      return (
        <div className="p-8 max-w-6xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Загружаем сценарий...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (!versionToRender) {
      return (
        <div className="p-8 max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Сценарий не найден. Пожалуйста, создайте новый сценарий.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Edit2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Редактор сценария</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Просмотрите и отредактируйте сцены, примените рекомендации AI
          </p>
        </div>

        <div className="space-y-4">
          <SourceSummaryBar source={editorSourceData} projectId={project.id} />
          
          {/* Reanalysis Progress Card */}
          {jobStatus && (
            <ReanalysisProgressCard
              status={jobStatus.status}
              step={jobStatus.step}
              progress={jobStatus.progress}
              error={jobStatus.error}
              canRetry={jobStatus.canRetry}
              onRetry={() => {
                if (lastSubmittedPayload.current) {
                  reanalyzeMutation.mutate(lastSubmittedPayload.current);
                }
              }}
            />
          )}
          
          {/* Candidate Version Banner */}
          {hasCandidate && candidate && (
            <Card className="border-primary/50 bg-primary/5" data-testid="banner-candidate">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        Новая версия v{candidate.versionNumber} сохранена
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reanalyzeJobId ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Анализ выполняется...
                          </span>
                        ) : (
                          candidate.metrics ? "Анализ завершён" : "Ожидание анализа"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCompare}
                      disabled={!candidate.metrics || reanalyzeJobId !== null}
                      data-testid="button-compare-banner"
                    >
                      <GitCompareArrows className="h-4 w-4 mr-2" />
                      Сравнить
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => acceptMutation.mutate(candidate.id)}
                      disabled={acceptMutation.isPending || !candidate.metrics || reanalyzeJobId !== null}
                      data-testid="button-accept-banner"
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Принимаем...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Принять
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rejectMutation.mutate(candidate.id)}
                      disabled={rejectMutation.isPending}
                      data-testid="button-reject-banner"
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div data-testid="scene-editor">
            <SceneEditor
              projectId={project.id}
              scenes={versionToRender.scenes}
              activeVersionId={versionToRender.id}
              onReanalyze={(scenes, fullScript) => {
                if (reanalyzeMutation.isPending) return;
                reanalyzeMutation.mutate({ scenes, fullScript });
              }}
              onOpenCompare={handleOpenCompare}
              hasCandidate={hasCandidate}
              reanalyzeJobId={reanalyzeJobId}
              jobStatus={jobStatus}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              size="lg"
              onClick={handleProceed}
              disabled={updateProjectMutation.isPending}
              data-testid="button-proceed"
            >
              {updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохраняем...
                </>
              ) : (
                <>
                  Перейти к озвучке
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Compare Modal */}
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          projectId={project.id}
          reanalyzeJobId={reanalyzeJobId}
          jobStatus={jobStatus}
          onNavigateToVoice={handleProceed}
        />
      </div>
    )
  }

  // Existing UI (when feature flag is off OR script exists)
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Analysis & Formatting</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Review AI-generated scenes and choose your preferred format
        </p>
      </div>

      <div className="space-y-6">
        {/* Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Format Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FORMAT_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                    selectedFormat === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedFormat(template.id)}
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    {selectedFormat === template.id && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={advancedAnalyzeMutation.isPending || analyzeMutation.isPending || !content}
                data-testid="button-analyze"
                variant={(advancedAnalysis || analysis) ? "outline" : "default"}
              >
                {(advancedAnalyzeMutation.isPending || analyzeMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (advancedAnalysis || analysis) ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Re-analyze with Selected Format
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Content (Advanced)
                  </>
                )}
              </Button>
              {(advancedAnalysis || analysis) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Re-analyzing will use AI credits (~$0.08-0.12 for deep analysis)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {(analyzeMutation.isError || advancedAnalyzeMutation.isError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-analysis">
              {(advancedAnalyzeMutation.error as any)?.message || 
               (analyzeMutation.error as any)?.message || 
               "Failed to analyze content. Please check your Anthropic API key in Settings."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {advancedAnalyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Multi-Agent AI Analysis in Progress...</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>Hook → Structure → Emotional → CTA → Synthesis</span>
                </div>
                <p className="text-sm text-muted-foreground">This may take 8-15 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legacy Loading State */}
        {analyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">AI is analyzing your content...</p>
                <p className="text-sm text-muted-foreground">This may take 5-10 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Analysis Results */}
        {advancedAnalysis && !advancedAnalyzeMutation.isPending && (
          <>
            <AdvancedAnalysisDisplay 
              analysis={advancedAnalysis} 
              analysisTime={analysisTime}
            />

            {/* Interactive Scene Editor with Recommendations */}
            {stepData?.scenes && stepData.scenes.length > 0 && (
              <SceneEditor
                projectId={project.id}
                scenes={stepData.scenes}
                onReanalyze={(scenes, fullScript) => setReanalyzeDialogOpen(true)}
                onOpenCompare={handleOpenCompare}
                hasCandidate={hasCandidate}
                reanalyzeJobId={reanalyzeJobId}
                jobStatus={jobStatus}
              />
            )}

            {/* Action Buttons for Advanced Analysis */}
            <div className="flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleProceed}
                disabled={updateProjectMutation.isPending}
                data-testid="button-proceed"
              >
                {updateProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Voice Generation
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Legacy Simple Analysis Results */}
        {analysis && !analyzeMutation.isPending && !advancedAnalysis && (
          <>
            {/* Overall Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <div className="text-center">
                    <ScoreBadge score={analysis.overallScore} size="lg" className="mb-2" data-testid="score-overall" />
                    <p className="text-sm font-medium">Overall Score</p>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Comment
                    </h3>
                    <p className="text-sm text-muted-foreground italic leading-relaxed" data-testid="text-overall-comment">
                      {analysis.overallComment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scene Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Script Scenes ({analysis.scenes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scene-0" className="w-full">
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {analysis.scenes.map((scene, idx) => (
                      <TabsTrigger
                        key={scene.id}
                        value={`scene-${idx}`}
                        className="gap-2"
                        data-testid={`tab-scene-${idx}`}
                      >
                        Scene {idx + 1}
                        <ScoreBadge score={getSceneScore(scene)} size="sm" />
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {analysis.scenes.map((scene, idx) => (
                    <TabsContent key={scene.id} value={`scene-${idx}`} className="mt-4 space-y-4">
                      {/* Original/Edited Text */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            Scene {idx + 1} Text
                            <ScoreBadge score={getSceneScore(scene)} size="sm" data-testid={`score-scene-${idx}`} />
                          </label>
                          {!editedScenes[scene.id] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditing(scene.id)}
                              data-testid={`button-edit-scene-${idx}`}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        
                        {isEditing === scene.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedScenes[scene.id] || getSceneText(scene)}
                              onChange={(e) => setEditedScenes({ ...editedScenes, [scene.id]: e.target.value })}
                              rows={4}
                              className="resize-none"
                              data-testid={`textarea-scene-${idx}`}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setIsEditing(null)
                                  await autoSaveCache(selectedVariants, variantScores)
                                }}
                                data-testid={`button-save-scene-${idx}`}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newEdited = { ...editedScenes }
                                  delete newEdited[scene.id]
                                  setEditedScenes(newEdited)
                                  setIsEditing(null)
                                }}
                                data-testid={`button-cancel-edit-scene-${idx}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-scene-${idx}`}>
                              {getSceneText(scene)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Variant Selector */}
                      {scene.variants.length > 0 && !editedScenes[scene.id] && (
                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Alternative Versions
                          </label>
                          <div className="space-y-2">
                            {/* Original */}
                            <div
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                                selectedVariants[scene.id] === undefined
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => handleVariantChange(scene.id, "original", scene)}
                              data-testid={`variant-original-scene-${idx}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Original</span>
                                <ScoreBadge score={scene.score} size="sm" />
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {scene.text}
                              </p>
                            </div>

                            {/* Variants */}
                            {scene.variants.map((variant, vIdx) => {
                              const scoreKey = `${scene.id}-${vIdx}`
                              const variantScore = variantScores[scoreKey]
                              const isScoring = scoringVariant === scoreKey

                              return (
                                <div
                                  key={vIdx}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                                    selectedVariants[scene.id] === vIdx
                                      ? "border-primary bg-primary/5"
                                      : "border-border"
                                  }`}
                                  onClick={() => handleVariantChange(scene.id, vIdx.toString(), scene)}
                                  data-testid={`variant-${vIdx}-scene-${idx}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">Version {vIdx + 1}</span>
                                    {isScoring ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : variantScore !== undefined ? (
                                      <ScoreBadge score={variantScore} size="sm" />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Click to score</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {variant}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleProceed}
                disabled={updateProjectMutation.isPending}
                data-testid="button-proceed"
              >
                {updateProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Voice Generation
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Re-analyze Cost Warning Dialog */}
      <AlertDialog open={reanalyzeDialogOpen} onOpenChange={setReanalyzeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-analyze Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Re-running the analysis will consume AI credits (~$0.08-0.12 for deep analysis with 5 agents).
              Your previous analysis results will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reanalyze">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReanalyze} data-testid="button-confirm-reanalyze">
              Proceed and Re-analyze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compare Modal */}
      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        projectId={project.id}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        baseVersionId={hasCandidate ? currentVersion?.id : undefined}
        targetVersionId={hasCandidate ? candidateVersion?.id : undefined}
      />

      {/* Recovery Modal for NO_SCENES error */}
      <Dialog open={recoveryModalOpen} onOpenChange={setRecoveryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Не удалось создать сценарий
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {recoveryError?.message || 'AI не смог создать сцены после нескольких попыток'}
            </p>
            
            {recoveryError?.suggestions && recoveryError.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Попробуйте:</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {recoveryError.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setRecoveryModalOpen(false);
                  if (failedFormatId) {
                    generateMutation.mutate(failedFormatId);
                  }
                }}
                disabled={generateMutation.isPending}
                data-testid="button-retry-generation"
              >
                <Zap className="h-4 w-4 mr-2" />
                Повторить попытку
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setRecoveryModalOpen(false);
                  // Scroll to format selection
                  const formatSection = document.querySelector('[data-testid="format-selection"]');
                  if (formatSection) {
                    formatSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                data-testid="button-choose-different-format"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Выбрать другой формат
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => {
                  setRecoveryModalOpen(false);
                  toast({
                    title: "Функция в разработке",
                    description: "Создание версии из статьи будет доступно в следующей версии",
                  });
                }}
                data-testid="button-create-draft"
              >
                <FileText className="h-4 w-4 mr-2" />
                Создать версию из статьи
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
