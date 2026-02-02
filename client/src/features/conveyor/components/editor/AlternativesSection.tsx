import { MessageSquare, RefreshCw } from 'lucide-react'
import { Button, Card } from '@/shared/ui'
import { AlternativeCard } from './AlternativeCard'

interface AlternativesSectionProps {
  alternatives: string[]
  isRegenerating?: boolean
  onSelectAlternative: (index: number) => void
  onOpenPrompt: () => void
  onRegenerate: () => void
}

export function AlternativesSection({
  alternatives,
  isRegenerating = false,
  onSelectAlternative,
  onOpenPrompt,
  onRegenerate,
}: AlternativesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Варианты замены
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPrompt}
            disabled={isRegenerating}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Промпт
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Перегенерировать
          </Button>
        </div>
      </div>

      {alternatives.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {alternatives.slice(0, 3).map((alt, index) => (
            <AlternativeCard
              key={index}
              text={alt}
              variantNumber={index + 1}
              onSelect={() => onSelectAlternative(index)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-6 bg-card/50">
          <p className="text-sm text-muted-foreground text-center">
            Нет доступных вариантов. Нажмите "Перегенерировать" для создания альтернатив.
          </p>
        </Card>
      )}
    </div>
  )
}
