import { ScriptScene } from '../../types'

interface SceneCardProps {
  scene: ScriptScene
}

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <div className="glass rounded-lg p-4 border border-dark-700/50">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-md font-semibold text-white">Сцена {scene.number}</h5>
        <span className="text-sm text-gray-400">Длительность: {scene.duration} сек</span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-300 leading-relaxed">{scene.text}</p>
      </div>

      {scene.visual && (
        <div className="pt-3 border-t border-dark-700/50">
          <p className="text-sm text-gray-400">
            <span className="font-medium">Визуал:</span> {scene.visual}
          </p>
        </div>
      )}

      {scene.changes && scene.changes.modified && (
        <div className="mt-3 pt-3 border-t border-dark-700/50">
          <div className="text-xs text-yellow-400">
            {scene.changes.added.length > 0 && (
              <div className="mb-1">
                <span className="text-green-400">+</span> {scene.changes.added.join(', ')}
              </div>
            )}
            {scene.changes.removed.length > 0 && (
              <div>
                <span className="text-red-400">-</span> {scene.changes.removed.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
