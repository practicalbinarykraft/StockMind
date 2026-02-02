import { Check } from 'lucide-react'
import { cn } from '@/shared/utils'

interface AlternativeCardProps {
  text: string
  variantNumber: number
  isSelected?: boolean
  onSelect: () => void
}

export function AlternativeCard({ text, variantNumber, isSelected = false, onSelect }: AlternativeCardProps) {
  return (
    <div 
      onClick={onSelect}
      className={cn(
        'glass rounded-lg p-3 transition-all duration-300 hover-lift border cursor-pointer',
        isSelected 
          ? 'border-cyan-500/50 bg-cyan-500/10 hover:border-cyan-500/70' 
          : 'border-border/30 hover:bg-card/70 hover:border-primary/30'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className={cn(
          "text-sm font-medium",
          isSelected ? "text-cyan-400" : "text-cyan-400"
        )}>
          Вариант {variantNumber}
        </h4>
        {isSelected && (
          <div
            className="h-6 w-6 p-0 flex items-center justify-center rounded bg-cyan-500/20"
            title="Выбранный вариант"
          >
            <Check className="h-4 w-4 text-cyan-400" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
