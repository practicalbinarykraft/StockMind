import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GripVertical, Trash2, Edit } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Scene {
  id: string
  type: 'hook' | 'body' | 'cta'
  text: string
}

interface SceneEditorProps {
  scene: Scene
  index: number
  onChange: (id: string, text: string) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  onSelect?: () => void
}

const typeLabels = {
  hook: 'Hook - Захват внимания',
  body: 'Body - Основной контент',
  cta: 'CTA - Призыв к действию'
}

const getPlaceholder = (type: Scene['type']) => {
  switch (type) {
    case 'hook':
      return 'Напишите захватывающее начало, которое остановит скроллинг...'
    case 'body':
      return 'Основной контент с ключевой информацией...'
    case 'cta':
      return 'Призыв к действию - что должен сделать зритель?'
    default:
      return 'Введите текст сцены...'
  }
}

export function SceneEditor({ 
  scene, 
  index, 
  onChange, 
  onDelete,
  isSelected = false,
  onSelect
}: SceneEditorProps) {
  const wordCount = scene.text.split(/\s+/).filter(Boolean).length
  const duration = Math.ceil(wordCount / 2.5) // ~2.5 слова/сек

  return (
    <div 
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-all",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <span className="font-medium">Scene {index + 1}</span>
          <Badge variant="outline">{typeLabels[scene.type]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {onSelect && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onSelect}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onDelete(scene.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Textarea
        value={scene.text}
        onChange={(e) => onChange(scene.id, e.target.value)}
        placeholder={getPlaceholder(scene.type)}
        className="min-h-[100px]"
      />
      
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{wordCount} слов</span>
        <span>~{duration} сек</span>
      </div>
    </div>
  )
}

