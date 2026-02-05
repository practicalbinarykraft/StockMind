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
    <Card className="p-4 border-l border-purple-500">
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
        <div className="flex items-center gap-2">
          {/* Метка источника версии */}
          {script.source ? (
            <Badge 
              variant={script.source === 'conveyor' ? 'default' : 'secondary'}
              className={script.source === 'conveyor' 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                : 'bg-green-500/10 text-green-400 border-green-500/30'
              }
            >
              {script.source === 'conveyor' ? 'Конвейер' : 'Черновик'}
            </Badge>
          ) : script.isFromConveyor && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              Конвейер
            </Badge>
          )}
          <Badge variant={script.status === 'draft' ? 'secondary' : 'default'}>
            {script.status === 'draft' ? 'Черновик' : 'Отправлен на рецензию'}
          </Badge>
        </div>
      </div>

      {/* Scenes */}
      <div className="space-y-3">
        {script.scenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>
    </Card>
  )
}
