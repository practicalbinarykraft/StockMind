import { useState, useRef, useMemo, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { NewsScript, ScriptVersion, Review, Script, Scene } from '../../types'
import { ScriptVersionBlock } from './ScriptVersionBlock'
import { ReviewBlock } from './ReviewBlock'
import { TimelineMinimap } from './TimelineMinimap'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { useScriptIterations } from '../../hooks/use-scripts'
import { scriptsService } from '../../services/scriptsService'

interface IterationTimelineProps {
  script: NewsScript | Script
  onBack: () => void
}

type TimelineItem = 
  | { type: 'script'; data: ScriptVersion }
  | { type: 'review'; data: Review }

// Преобразование версии из API в формат ScriptVersion
function convertVersionToScriptVersion(version: any, versionNumber: number, isFirst: boolean = false): ScriptVersion {
  return {
    id: version.id,
    version: versionNumber,
    scenes: (version.scenes || []).map((scene: any, index: number) => ({
      id: scene.id || `scene-${index}`,
      number: index + 1,
      text: scene.text || '',
      visual: scene.visualNotes || scene.visualSource || '',
      duration: scene.duration || (scene.durationInFrames ? scene.durationInFrames / 30 : 0),
    })),
    generatedAt: new Date(version.createdAt || version.updatedAt || Date.now()),
    status: version.isCurrent || version.status === 'draft' ? 'draft' : 'sent_for_review',
    isFromConveyor: isFirst, // Первая версия всегда из конвейера
  }
}

// Создание Review из feedbackText и feedbackSceneIds
function createReviewFromFeedback(
  version: any,
  versionNumber: number,
  scenes: any[]
): Review | null {
  if (!version.feedbackText) return null

  const feedbackSceneIds = version.feedbackSceneIds || []
  
  // Если есть конкретные ID сцен с комментариями, создаем комментарии к ним
  let sceneComments = []
  if (feedbackSceneIds.length > 0) {
    sceneComments = feedbackSceneIds.map((sceneIndex: number) => {
      const sceneNumber = sceneIndex + 1
      return {
        sceneId: scenes[sceneIndex]?.id || `scene-${sceneIndex}`,
        sceneNumber,
        comments: [
          {
            id: `comment-${version.id}-${sceneIndex}`,
            type: 'suggestion' as const,
            text: version.feedbackText,
          },
        ],
      }
    })
  }

  return {
    id: `review-${version.id}`,
    overallScore: version.finalScore || 0,
    overallComment: version.feedbackText || 'Нет комментариев',
    sceneComments,
    createdAt: new Date(version.createdAt || Date.now()),
  }
}

// Создание фейковой итерации из текущего сценария (для библиотечных скриптов)
function createFallbackIteration(script: Script): ScriptVersion {
  return {
    id: script.id,
    version: 1,
    scenes: (script.scenes || []).map((scene: Scene, index: number) => ({
      id: scene.id,
      number: index + 1,
      text: scene.text,
      visual: scene.visualSource || '',
      duration: (scene.durationInFrames || 0) / 30, // convert frames to seconds
    })),
    generatedAt: new Date(script.createdAt || Date.now()),
    status: 'draft',
  }
}

// Создание Review из комментариев к сценам
function createReviewFromSceneComments(
  comments: any[],
  scenes: any[]
): Review | null {
  if (!comments || comments.length === 0) return null

  // Группируем комментарии по сценам
  const commentsByScene = comments.reduce((acc, comment) => {
    const sceneId = comment.sceneId
    if (!acc[sceneId]) {
      acc[sceneId] = []
    }
    acc[sceneId].push(comment)
    return acc
  }, {} as Record<string, any[]>)

  // Создаем комментарии к сценам
  const sceneComments = Object.entries(commentsByScene).map(([sceneId, sceneCommentsList]) => {
    const commentsList = sceneCommentsList as any[]
    const scene = scenes.find(s => s.id === sceneId)
    const sceneNumber = scene?.number || commentsList[0]?.sceneIndex + 1 || 1
    
    return {
      sceneId,
      sceneNumber,
      comments: commentsList.map((c: any) => ({
        id: c.id,
        type: 'suggestion' as const,
        text: c.commentText,
      })),
    }
  })

  // Объединяем все комментарии в один общий текст
  const allCommentsText = comments.map(c => c.commentText).join('\n\n')

  return {
    id: `review-comments-${Date.now()}`,
    overallScore: 0,
    overallComment: allCommentsText || 'Комментарии к сценам',
    sceneComments,
    createdAt: new Date(comments[0]?.createdAt || Date.now()),
  }
}

export function IterationTimeline({ script, onBack }: IterationTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [sceneComments, setSceneComments] = useState<any[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  
  // Загружаем итерации из API (только для auto_scripts)
  // Получаем версии (только пользовательские версии, checkpoint'ы находятся в отдельной таблице)
  const { data: versionsData, isLoading } = useScriptIterations(script.id)
  
  // Загружаем комментарии к сценам
  useEffect(() => {
    async function loadComments() {
      try {
        setIsLoadingComments(true)
        const comments = await scriptsService.getScriptComments(script.id)
        setSceneComments(comments || [])
      } catch (error) {
        console.error('Failed to load scene comments:', error)
        setSceneComments([])
      } finally {
        setIsLoadingComments(false)
      }
    }
    
    if (script.id) {
      loadComments()
    }
  }, [script.id])
  
  // Формируем timeline items из версий или из текущего сценария
  // Логика: Версия 1 → Рецензия 1 (пустая или с комментариями) → Версия 2 → Рецензия 2 → ...
  const items: TimelineItem[] = useMemo(() => {
    // Если есть iterations в script (NewsScript), используем их
    const newsScript = script as NewsScript
    if ('iterations' in newsScript && newsScript.iterations && newsScript.iterations.length > 0) {
      return newsScript.iterations.flatMap(iter => [
        { type: 'script' as const, data: iter.script },
        ...(iter.review ? [{ type: 'review' as const, data: iter.review }] : []),
      ])
    }
    
    // Если есть данные из API (версии auto_script или scripts_library)
    const versions = (versionsData as any)?.versions
    if (versions && versions.length > 0) {
      const timelineItems: TimelineItem[] = []
      
      // Обрабатываем каждую версию
      for (let i = 0; i < versions.length; i++) {
        const version = versions[i]
        const versionNumber = version.versionNumber || version.version || (i + 1)
        const isFirst = i === 0
        const isLast = i === versions.length - 1
        
        // Добавляем версию скрипта
        const scriptVersion = convertVersionToScriptVersion(version, versionNumber, isFirst)
        timelineItems.push({ type: 'script', data: scriptVersion })
        
        // После каждой версии добавляем рецензию:
        // - Если есть feedbackText или finalScore - полная рецензия
        // - Если есть следующая версия но нет feedbackText - пустая рецензия (показывает что была проверка)
        // - Для последней версии - рецензия только если есть данные или комментарии
        const hasFeedback = version.feedbackText || version.finalScore || version.aiScore
        const hasNextVersion = i < versions.length - 1
        
        if (hasFeedback) {
          // Есть данные рецензии - создаём полную
          const review = createReviewFromFeedback(
            version,
            versionNumber,
            version.scenes || []
          )
          if (review) {
            timelineItems.push({ type: 'review', data: review })
          }
        } else if (hasNextVersion) {
          // Нет данных но есть следующая версия - создаём пустую рецензию
          // (это показывает что версия была проверена перед созданием следующей)
          const emptyReview: Review = {
            id: `review-empty-${version.id || i}`,
            overallScore: 0,
            overallComment: 'Версия проверена без замечаний',
            sceneComments: [],
            createdAt: new Date(version.createdAt || Date.now()),
          }
          timelineItems.push({ type: 'review', data: emptyReview })
        } else if (isLast && sceneComments.length > 0) {
          // Последняя версия и есть комментарии к сценам
          const commentsReview = createReviewFromSceneComments(sceneComments, scriptVersion.scenes)
          if (commentsReview) {
            timelineItems.push({ type: 'review', data: commentsReview })
          }
        }
      }
      
      return timelineItems
    }
    
    // Fallback: создаем одну итерацию из текущих данных (для библиотечных скриптов)
    const fallbackVersion = createFallbackIteration(script as Script)
    const timelineItems: TimelineItem[] = [{ type: 'script', data: fallbackVersion }]
    
    // Если есть комментарии к сценам, добавляем их как review
    if (sceneComments.length > 0) {
      const commentsReview = createReviewFromSceneComments(sceneComments, fallbackVersion.scenes)
      if (commentsReview) {
        timelineItems.push({ type: 'review', data: commentsReview })
      }
    }
    
    return timelineItems
  }, [script, versionsData, sceneComments])

  const handleMinimapClick = (index: number) => {
    setSelectedIndex(index)
    if (timelineRef.current) {
      const item = timelineRef.current.children[index] as HTMLElement
      item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }

  // Получаем название скрипта
  const scriptTitle = 'newsTitle' in script ? script.newsTitle : script.title

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-xl font-bold">{scriptTitle}</h3>
          <div></div>
        </div>
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Загрузка итераций...</span>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-xl font-bold">{scriptTitle}</h3>
        <div></div>
      </div>

      {/* Minimap */}
      <TimelineMinimap
        items={items}
        selectedIndex={selectedIndex}
        onSelect={handleMinimapClick}
      />

      {/* Timeline */}
      <Card className="p-6 overflow-hidden">
        <div
          ref={timelineRef}
          className="flex gap-6 overflow-x-auto pb-4"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full md:w-[600px]"
              onClick={() => setSelectedIndex(index)}
            >
              {item.type === 'script' ? (
                <ScriptVersionBlock script={item.data} />
              ) : (
                <ReviewBlock review={item.data} />
              )}
            </div>
          ))}

          {/* Final Actions Block */}
          {'status' in script && script.status === 'completed' && (
            <Card className="flex-shrink-0 w-full md:w-[600px] p-6">
              <h4 className="text-lg font-bold mb-4">Финальные действия</h4>
              <div className="flex flex-col gap-3">
                {('iterations' in script && !script.iterations[script.iterations.length - 1]?.review) && (
                  <Button>
                    Отправить на рецензию человеку
                  </Button>
                )}
                {('currentIteration' in script && 'maxIterations' in script && 
                  script.currentIteration < script.maxIterations) && (
                  <Button variant="outline">
                    Запустить ещё одну итерацию
                  </Button>
                )}
                <Button variant="outline">
                  Отметить как готовый
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  )
}
