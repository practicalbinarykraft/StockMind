import { Check } from 'lucide-react'

interface AlternativeCardProps {
  text: string
  variantNumber: number
  onSelect: () => void
}

export function AlternativeCard({ text, variantNumber, onSelect }: AlternativeCardProps) {
  return (
    <div className="glass rounded-lg p-3 hover:bg-card/70 hover:border-primary/30 transition-all duration-300 hover-lift border border-border/30">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-cyan-400">
          Вариант {variantNumber}
        </h4>
        <button
          onClick={onSelect}
          className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-primary/20 transition-colors"
          title="Выбрать этот вариант"
        >
          <Check className="h-4 w-4 text-primary" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
