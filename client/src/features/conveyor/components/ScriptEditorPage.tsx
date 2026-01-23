/**
 * Страница редактора сценария
 */

import { useState, useEffect } from 'react'
import { useLocation, useRoute } from 'wouter'
import { Save, ArrowLeft, Plus } from 'lucide-react'
import { useScript, useScriptActions } from '../hooks/use-scripts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { Textarea } from '@/shared/ui/textarea'
import { ScrollArea } from '@/shared/ui/scroll-area'

export function ScriptEditorPage() {
  const [, navigate] = useLocation()
  const [, params] = useRoute('/conveyor/drafts/:id')
  const scriptId = params?.id || ''

  const { data: script, isLoading } = useScript(scriptId)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedScene = script?.scenes?.find((s) => s.id === selectedSceneId)

  // Инициализация при загрузке скрипта
  useEffect(() => {
    if (script?.scenes && script.scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(script.scenes[0].id)
    }
  }, [script, selectedSceneId])

  // Инициализация текста для редактирования при выборе сцены
  useEffect(() => {
    if (selectedScene) {
      setEditingText(selectedScene.text)
      setHasUnsavedChanges(false)
    }
  }, [selectedSceneId, selectedScene])

  const handleTextChange = (text: string) => {
    setEditingText(text)
    setHasUnsavedChanges(text !== selectedScene?.text)
  }

  const handleSaveScene = () => {
    // TODO: Implement save logic
    setHasUnsavedChanges(false)
  }

  const handleSaveScript = () => {
    // TODO: Implement save script logic
  }

  const handleUseAlternative = (alternativeIndex: number) => {
    if (selectedScene && selectedScene.alternatives[alternativeIndex]) {
      setEditingText(selectedScene.alternatives[alternativeIndex])
      setHasUnsavedChanges(true)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor/drafts')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-1" />
          <Skeleton className="h-96 col-span-2" />
        </div>
      </div>
    )
  }

  if (!script) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor/drafts')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold">Сценарий не найден</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor/drafts')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{script.newsTitle}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{script.status}</Badge>
              <span className="text-sm text-muted-foreground">
                {script.scenes?.length || 0} сцен
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSaveScript}
            disabled={!hasUnsavedChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenes List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Сцены</span>
              <Button size="sm" variant="ghost">
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {script.scenes?.map((scene, index) => (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSceneId === scene.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      Сцена {scene.order}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scene.text}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Scene Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Редактор сцены {selectedScene?.order}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedScene ? (
              <>
                {/* Main Text Editor */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Текст сцены
                  </label>
                  <Textarea
                    value={editingText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  {hasUnsavedChanges && (
                    <Button
                      onClick={handleSaveScene}
                      size="sm"
                      className="mt-2"
                    >
                      Применить изменения
                    </Button>
                  )}
                </div>

                {/* Alternatives */}
                {selectedScene.alternatives && selectedScene.alternatives.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Альтернативные варианты
                    </label>
                    <div className="space-y-2">
                      {selectedScene.alternatives.map((alt, index) => (
                        <div
                          key={index}
                          onClick={() => handleUseAlternative(index)}
                          className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                        >
                          {alt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Выберите сцену для редактирования</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
