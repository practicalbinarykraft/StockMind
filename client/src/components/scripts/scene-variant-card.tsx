import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SceneVariant {
  id: string
  text: string
  score?: number
}

interface SceneVariantCardProps {
  variant: SceneVariant
  label: string
  isSelected?: boolean
  onSelect: () => void
}

export function SceneVariantCard({ 
  variant, 
  label, 
  isSelected, 
  onSelect 
}: SceneVariantCardProps) {
  const wordCount = variant.text.split(/\s+/).filter(Boolean).length
  const duration = Math.ceil(wordCount / 2.5)

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary",
        isSelected && "border-primary ring-2 ring-primary/20"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{label}</Badge>
            {variant.id?.startsWith('custom-') && (
              <Badge variant="secondary" className="text-xs">Custom</Badge>
            )}
          </div>
          {variant.score && (
            <Badge variant="secondary">{variant.score}/100</Badge>
          )}
        </div>
        
        <p className="text-sm leading-relaxed">{variant.text}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {wordCount} слов • ~{duration} сек
          </span>
          {isSelected && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              Выбрано
            </Badge>
          )}
        </div>
        
        {!isSelected && (
          <Button 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            Выбрать {label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

