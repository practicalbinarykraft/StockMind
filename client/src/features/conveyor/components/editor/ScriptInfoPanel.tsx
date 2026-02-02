import { ScrollArea } from '@/shared/ui/scroll-area'
import { ScriptVersionCard } from './ScriptVersionCard'
import { SceneSummaryItem } from './SceneSummaryItem'
import type { Scene } from '../../types'

interface ScriptInfoPanelProps {
  version?: number
  status: string
  createdAt: string
  scenes: Scene[]
}

export function ScriptInfoPanel({
  version = 1,
  status,
  createdAt,
  scenes,
}: ScriptInfoPanelProps) {
  return (
    <div className="flex flex-col h-full space-y-3">
      <ScriptVersionCard
        version={version}
        status={status}
        createdAt={createdAt}
      />

      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm font-semibold mb-2">Обзор сцен</h4>
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="pr-4">
            {scenes.map((scene) => (
              <SceneSummaryItem key={scene.id} scene={scene} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
