import { Clock, FileText } from 'lucide-react'
import type { ScriptVersion } from '../../types'
import { SceneCard } from './SceneCard'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'

interface ScriptVersionBlockProps {
  script: ScriptVersion
}

export function ScriptVersionBlock({ script }: ScriptVersionBlockProps) {
  return (
    <Card className="p-6 border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold">Сценарий v{script.version}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {new Date(script.generatedAt).toLocaleString('ru-RU')}
            </div>
          </div>
        </div>
        <Badge variant={script.status === 'draft' ? 'secondary' : 'default'}>
          {script.status === 'draft' ? 'Черновик' : 'Отправлен на рецензию'}
        </Badge>
      </div>

      {/* Scenes */}
      <div className="space-y-4">
        {script.scenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    </Card>
  )
}
