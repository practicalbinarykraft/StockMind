import { useState, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { NewsScript, ScriptVersion, Review } from '../../types'
import { ScriptVersionBlock } from './ScriptVersionBlock'
import { ReviewBlock } from './ReviewBlock'
import { TimelineMinimap } from './TimelineMinimap'
import Button from '../ui/Button'

interface IterationTimelineProps {
  script: NewsScript
  onBack: () => void
}

type TimelineItem = 
  | { type: 'script'; data: ScriptVersion }
  | { type: 'review'; data: Review }

export function IterationTimeline({ script, onBack }: IterationTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const items: TimelineItem[] = script.iterations.flatMap(iter => [
    { type: 'script' as const, data: iter.script },
    ...(iter.review ? [{ type: 'review' as const, data: iter.review }] : []),
  ])

  const handleMinimapClick = (index: number) => {
    setSelectedIndex(index)
    if (timelineRef.current) {
      const item = timelineRef.current.children[index] as HTMLElement
      item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h3 className="text-xl font-bold text-white">{script.newsTitle}</h3>
        <div></div>
      </div>

      {/* Minimap */}
      <TimelineMinimap
        items={items}
        selectedIndex={selectedIndex}
        onSelect={handleMinimapClick}
      />

      {/* Timeline */}
      <div className="glass rounded-xl p-6 glow-border overflow-hidden">
        <div
          ref={timelineRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full md:w-[600px]"
              onClick={() => setSelectedIndex(index)}
            >
              {item.type === 'script' ? (
                <ScriptVersionBlock script={item.data} />
              ) : (
                <ReviewBlock review={item.data} />
              )}
            </div>
          ))}

          {/* Final Actions Block */}
          {script.status === 'completed' && (
            <div className="flex-shrink-0 w-full md:w-[600px] glass rounded-lg p-6">
              <h4 className="text-lg font-bold text-white mb-4">Финальные действия</h4>
              <div className="flex flex-col gap-3">
                {!script.iterations[script.iterations.length - 1]?.review && (
                  <Button variant="primary" size="md">
                    Отправить на рецензию человеку
                  </Button>
                )}
                {script.currentIteration < script.maxIterations && (
                  <Button variant="secondary" size="md">
                    Запустить ещё одну итерацию
                  </Button>
                )}
                <Button variant="secondary" size="md">
                  Отметить как готовый
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
