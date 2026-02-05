import { ScriptVersion, Review } from '../../types'

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
    <div className="glass rounded-lg p-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              index === selectedIndex
                ? 'bg-primary-500 text-white'
                : item.type === 'script'
                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {item.type === 'script' ? `v${item.data.version}` : `Рецензия`}
          </button>
        ))}
      </div>
    </div>
  )
}
