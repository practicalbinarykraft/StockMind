import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import { Card } from '@/shared/ui/card'
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
        <Card className="p-8 bg-card/50">
          <p className="text-muted-foreground text-center">
            Выберите сцену из списка для редактирования
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Текущий текст сцены */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold flex items-center gap-2">
            <span className="text-cyan-400">✦</span>
            Текущий текст сцены
            <span className="text-sm text-muted-foreground font-normal">— Сцена {scene.order}</span>
          </h3>
        </div>

        <Textarea
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          className="min-h-[200px] resize-none bg-card/50 border-border focus:border-cyan-500 transition-colors"
          placeholder="Введите текст сцены..."
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Назад
          </Button>
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
