import { AlertCircle, Clock, FileText } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'

interface RecoveryBannerProps {
  checkpoints: Array<{
    id: string
    reason: string
    createdAt: string
    metadata: any
  }>
  onRestore: (checkpointId: string) => Promise<void>
  onDismiss: () => void
}

export function RecoveryBanner({ checkpoints, onRestore, onDismiss }: RecoveryBannerProps) {
  const latestCheckpoint = checkpoints[0]
  
  if (!latestCheckpoint) return null
  
  const reasonText = {
    exit: 'Выход без сохранения',
    ttl: 'Автоматическое сохранение',
    pre_ai: 'Перед AI операцией',
    auto: 'Автосохранение',
    recovery: 'Восстановление'
  }[latestCheckpoint.reason] || 'Несохранённые изменения'
  
  const timeAgo = formatDistance(
    new Date(latestCheckpoint.createdAt), 
    new Date(), 
    { addSuffix: true, locale: ru }
  )
  
  return (
    <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Найдены несохранённые изменения
          </h3>
          
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Последнее редактирование: {timeAgo}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Причина: {reasonText}</span>
            </div>
            
            {latestCheckpoint.metadata?.editingSceneId && (
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                Редактировалась сцена: {latestCheckpoint.metadata.editingSceneId}
              </div>
            )}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <Button 
              size="sm" 
              onClick={() => onRestore(latestCheckpoint.id)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Восстановить изменения
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onDismiss}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-950/50"
            >
              Начать с текущей версии
            </Button>
          </div>
          
          {checkpoints.length > 1 && (
            <p className="mt-3 text-xs text-yellow-700 dark:text-yellow-400">
              Найдено ещё {checkpoints.length - 1} checkpoint(ов)
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
