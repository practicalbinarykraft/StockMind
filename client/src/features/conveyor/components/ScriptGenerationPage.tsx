/**
 * Страница AI-генерации сценариев
 */

import { useState, useCallback } from 'react'
import { useLocation } from 'wouter'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { useScripts, useAISettings, useAISettingsActions } from '../hooks/use-scripts'
import { AISettingsPanel } from './script-generation/AISettingsPanel'
import { NewsScriptList } from './script-generation/NewsScriptList'
import { IterationTimeline } from './script-generation/IterationTimeline'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'

export function ScriptGenerationPage() {
  const [, navigate] = useLocation()
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  // Загрузка данных
  const { data: scriptsData, isLoading, refetch } = useScripts()
  const { data: aiSettings } = useAISettings()
  const { updateSettings } = useAISettingsActions()
  const newsScripts = scriptsData?.items || []

  const selectedScript = newsScripts.find(s => s.id === selectedScriptId)

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleSelectScript = useCallback((scriptId: string) => {
    setSelectedScriptId(scriptId)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedScriptId(null)
  }, [])

  const handleSettingsChange = useCallback((newSettings: any) => {
    updateSettings.mutate(newSettings)
  }, [updateSettings])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold">AI-генерация сценариев</h2>
        </div>
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="ml-3 text-muted-foreground">Загрузка данных...</span>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">AI-генерация сценариев</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {newsScripts.length} сценариев
            </p>
          </div>
        </div>

        {/* Refresh button */}
        {!selectedScriptId && (
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
        )}
      </div>

      {/* AI Settings Panel */}
      {aiSettings && (
        <AISettingsPanel
          settings={aiSettings}
          onSettingsChange={handleSettingsChange}
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        />
      )}

      {/* News Scripts List or Iteration Timeline */}
      {!selectedScriptId ? (
        <NewsScriptList
          scripts={newsScripts}
          onSelectScript={handleSelectScript}
        />
      ) : selectedScript ? (
        <IterationTimeline
          script={selectedScript}
          onBack={handleBack}
        />
      ) : (
        <Card className="p-6">
          <p className="text-muted-foreground">Сценарий не найден</p>
        </Card>
      )}
    </div>
  )
}
