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
    <div className="glass rounded-xl p-4 flex flex-col space-y-3 max-h-[calc(100vh-160px)]">
      <ScriptVersionCard
        version={version}
        status={status}
        createdAt={createdAt}
      />

      <div className="flex-1 min-h-0">
        <h4 className="text-sm font-semibold mb-2 text-foreground">Обзор сцен</h4>
        <ScrollArea className="h-full">
          <div className="space-y-1.5 pr-3">
            {scenes.map((scene) => (
              <SceneSummaryItem key={scene.id} scene={scene} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
