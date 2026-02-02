import { FileText, CheckCircle } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'

interface ScriptVersionCardProps {
  version?: number
  status: string
  createdAt: string
}

export function ScriptVersionCard({ version = 1, status, createdAt }: ScriptVersionCardProps) {
  const statusLabels: Record<string, string> = {
    draft: 'Черновик',
    analyzed: 'Проанализирован',
    ready: 'Готов',
    in_production: 'В производстве',
    completed: 'Завершен',
  }

  const statusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    draft: 'secondary',
    analyzed: 'outline',
    ready: 'default',
    in_production: 'default',
    completed: 'default',
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold gradient-text">
              Сценарий v{version}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={statusVariants[status] || 'outline'} className="ml-2">
          {status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
          {statusLabels[status] || status}
        </Badge>
      </div>
    </div>
  )
}
