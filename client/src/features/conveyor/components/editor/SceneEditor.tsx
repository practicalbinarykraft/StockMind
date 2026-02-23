import { useState, useEffect } from 'react'
import { Save, X, Trash2 } from 'lucide-react'
import { Textarea } from '@/shared/ui/textarea'
import { AlternativesSection } from './AlternativesSection'
import type { Scene } from '../../types'

interface SceneEditorProps {
  scene: Scene | null
  isSaving?: boolean
  isRegenerating?: boolean
  onSave: (text: string) => void
  onCancel: () => void
  onDelete?: () => void
  onSelectAlternative: (index: number) => void
  onOpenPrompt: () => void
  onRegenerate: () => void
  onChange?: (hasChanges: boolean, currentText: string) => void
}

export function SceneEditor({
  scene,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onCancel,
  onDelete,
  onSelectAlternative,
  onOpenPrompt,
  onRegenerate,
  onChange,
}: SceneEditorProps) {
  const [editingText, setEditingText] = useState('')
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<number | null>(null)

  // Проверяем соответствие текста альтернативам
  const checkAlternativeMatch = (text: string, alternatives: string[]) => {
    const index = alternatives.findIndex(alt => alt === text)
    return index !== -1 ? index : null
  }

  useEffect(() => {
    if (scene) {
      setEditingText(scene.text)
      // Проверяем, соответствует ли текущий текст какой-то альтернативе
      const matchIndex = checkAlternativeMatch(scene.text, scene.alternatives)
      setSelectedAlternativeIndex(matchIndex)
    }
  }, [scene?.id, scene?.text, scene?.alternatives])

  const handleSave = () => {
    if (editingText.trim() && editingText !== scene?.text) {
      onSave(editingText)
      // НЕ сбрасываем selectedAlternativeIndex - он обновится автоматически через useEffect
    }
  }

  const handleTextChange = (newText: string) => {
    setEditingText(newText)
    if (scene) {
      const matchIndex = checkAlternativeMatch(newText, scene.alternatives)
      setSelectedAlternativeIndex(matchIndex)
      onChange?.(newText !== scene.text, newText)
    }
  }

  const handleSelectAlternative = (index: number) => {
    if (scene) {
      setEditingText(scene.alternatives[index])
      setSelectedAlternativeIndex(index)
      onSelectAlternative(index)
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
          onChange={(e) => handleTextChange(e.target.value)}
          className="min-h-[180px] resize-none bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
          placeholder="Введите текст сцены..."
        />

        <div className="flex gap-2 justify-between">
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
              onClick={() => {
                if (scene) {
                  setEditingText(scene.text)
                  const matchIndex = checkAlternativeMatch(scene.text, scene.alternatives)
                  setSelectedAlternativeIndex(matchIndex)
                  onChange?.(false, scene.text)
                }
                onCancel()
              }}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 border border-border/50 text-foreground rounded-lg font-medium hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Отменить
            </button>
          </div>
          
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={isSaving}
              className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Удалить сцену
            </button>
          )}
        </div>
      </div>

      {/* Варианты замены */}
      <AlternativesSection
        alternatives={scene.alternatives}
        selectedAlternativeIndex={selectedAlternativeIndex}
        isRegenerating={isRegenerating}
        onSelectAlternative={handleSelectAlternative}
        onOpenPrompt={onOpenPrompt}
        onRegenerate={onRegenerate}
      />
    </div>
  )
}
