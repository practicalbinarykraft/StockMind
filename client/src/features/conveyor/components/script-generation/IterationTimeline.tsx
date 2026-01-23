import { useState, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { NewsScript, ScriptVersion, Review } from '../../types'
import { ScriptVersionBlock } from './ScriptVersionBlock'
import { ReviewBlock } from './ReviewBlock'
import { TimelineMinimap } from './TimelineMinimap'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'

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
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-xl font-bold">{script.newsTitle}</h3>
        <div></div>
      </div>

      {/* Minimap */}
      <TimelineMinimap
        items={items}
        selectedIndex={selectedIndex}
        onSelect={handleMinimapClick}
      />

      {/* Timeline */}
      <Card className="p-6 overflow-hidden">
        <div
          ref={timelineRef}
          className="flex gap-6 overflow-x-auto pb-4"
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
            <Card className="flex-shrink-0 w-full md:w-[600px] p-6">
              <h4 className="text-lg font-bold mb-4">Финальные действия</h4>
              <div className="flex flex-col gap-3">
                {!script.iterations[script.iterations.length - 1]?.review && (
                  <Button>
                    Отправить на рецензию человеку
                  </Button>
                )}
                {script.currentIteration < script.maxIterations && (
                  <Button variant="outline">
                    Запустить ещё одну итерацию
                  </Button>
                )}
                <Button variant="outline">
                  Отметить как готовый
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  )
}
