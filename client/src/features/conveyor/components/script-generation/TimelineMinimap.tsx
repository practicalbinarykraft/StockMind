import type { ScriptVersion, Review } from '../../types'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'

type TimelineItem = 
  | { type: 'script'; data: ScriptVersion }
  | { type: 'review'; data: Review }

interface TimelineMinimapProps {
  items: TimelineItem[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function TimelineMinimap({ items, selectedIndex, onSelect }: TimelineMinimapProps) {
  return (
    <Card className="p-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {items.map((item, index) => (
          <Button
            key={index}
            onClick={() => onSelect(index)}
            variant={index === selectedIndex ? 'default' : 'outline'}
            size="sm"
            className={item.type === 'review' ? 'bg-green-500/20 hover:bg-green-500/30' : ''}
          >
            {item.type === 'script' ? `v${item.data.version}` : `Рецензия`}
          </Button>
        ))}
      </div>
    </Card>
  )
}
