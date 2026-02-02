import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { Textarea } from '@/shared/ui/textarea'
import { AlternativesSection } from './AlternativesSection'
import type { Scene } from '../../types'

interface SceneEditorProps {
  scene: Scene | null
  isSaving?: boolean
  isRegenerating?: boolean
  onSave: (text: string) => void
  onCancel: () => void
  onSelectAlternative: (index: number) => void
  onOpenPrompt: () => void
  onRegenerate: () => void
}

export function SceneEditor({
  scene,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onCancel,
  onSelectAlternative,
  onOpenPrompt,
  onRegenerate,
}: SceneEditorProps) {
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    if (scene) {
      setEditingText(scene.text)
    }
  }, [scene?.id])

  const handleSave = () => {
    if (editingText.trim() && editingText !== scene?.text) {
      onSave(editingText)
    }
  }

  const hasChanges = editingText !== scene?.text

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass rounded-xl p-8">
          <p className="text-muted-foreground text-center">
            Выберите сцену из списка для редактирования
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Текущий текст сцены */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold gradient-text flex items-center gap-2">
            <span>✦</span>
            Текущий текст сцены
            <span className="text-sm text-muted-foreground font-normal">— Сцена {scene.order}</span>
          </h3>
        </div>

        <Textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          className="min-h-[180px] resize-none bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
          placeholder="Введите текст сцены..."
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-cyan-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 border border-border/50 text-foreground rounded-lg font-medium hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Назад
          </button>
        </div>
      </div>

      {/* Варианты замены */}
      <AlternativesSection
        alternatives={scene.alternatives}
        isRegenerating={isRegenerating}
        onSelectAlternative={(index) => {
          setEditingText(scene.alternatives[index])
          onSelectAlternative(index)
        }}
        onOpenPrompt={onOpenPrompt}
        onRegenerate={onRegenerate}
      />
    </div>
  )
}
