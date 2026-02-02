import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Check } from 'lucide-react'

interface AlternativeCardProps {
  text: string
  variantNumber: number
  onSelect: () => void
}

export function AlternativeCard({ text, variantNumber, onSelect }: AlternativeCardProps) {
  return (
    <Card className="p-4 bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-cyan-400">
          Вариант {variantNumber}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={onSelect}
          title="Выбрать этот вариант"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </Card>
  )
}
