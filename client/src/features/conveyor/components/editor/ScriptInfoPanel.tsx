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
    <div className="glass rounded-xl p-4 flex flex-col space-y-3">
      <ScriptVersionCard
        version={version}
        status={status}
        createdAt={createdAt}
      />

      <div>
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto pr-3 space-y-1.5">
          {scenes.map((scene) => (
            <SceneSummaryItem key={scene.id} scene={scene} />
          ))}
        </div>
      </div>
    </div>
  )
}
