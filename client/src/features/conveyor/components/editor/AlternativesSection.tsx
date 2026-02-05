import { MessageSquare, RefreshCw } from 'lucide-react'
import { AlternativeCard } from './AlternativeCard'

interface AlternativesSectionProps {
  alternatives: string[]
  selectedAlternativeIndex?: number | null
  isRegenerating?: boolean
  onSelectAlternative: (index: number) => void
  onOpenPrompt: () => void
  onRegenerate: () => void
}

export function AlternativesSection({
  alternatives,
  selectedAlternativeIndex = null,
  isRegenerating = false,
  onSelectAlternative,
  onOpenPrompt,
  onRegenerate,
}: AlternativesSectionProps) {
  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold gradient-text flex items-center gap-2">
          <span>✦</span>
          Варианты замены
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onOpenPrompt}
            disabled={isRegenerating}
            className="px-3 py-1.5 text-sm border border-border/50 text-foreground rounded-lg hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            Промпт
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-3 py-1.5 text-sm border border-primary/30 text-primary rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Перегенерировать
          </button>
        </div>
      </div>

      {alternatives.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {alternatives.slice(0, 3).map((alt, index) => (
            <AlternativeCard
              key={index}
              text={alt}
              variantNumber={index + 1}
              isSelected={selectedAlternativeIndex === index}
              onSelect={() => onSelectAlternative(index)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-strong rounded-lg p-6">
          <p className="text-sm text-muted-foreground text-center">
            Нет доступных вариантов. Нажмите "Перегенерировать" для создания альтернатив.
          </p>
        </div>
      )}
    </div>
  )
}
