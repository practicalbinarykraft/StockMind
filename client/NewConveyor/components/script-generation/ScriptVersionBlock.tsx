import { Clock, FileText } from 'lucide-react'
import { ScriptVersion } from '../../types'
import { SceneCard } from './SceneCard'

interface ScriptVersionBlockProps {
  script: ScriptVersion
}

export function ScriptVersionBlock({ script }: ScriptVersionBlockProps) {
  return (
    <div className="glass rounded-lg p-6 border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Сценарий v{script.version}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              {new Date(script.generatedAt).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          script.status === 'draft' 
            ? 'bg-blue-500/20 text-blue-400' 
            : 'bg-green-500/20 text-green-400'
        }`}>
          {script.status === 'draft' ? 'Черновик' : 'Отправлен на рецензию'}
        </span>
      </div>

      {/* Scenes */}
      <div className="space-y-4">
        {script.scenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    </div>
  )
}
