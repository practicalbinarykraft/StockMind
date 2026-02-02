import { FileText, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
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
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            Сценарий v{version}
          </CardTitle>
          <Badge variant={statusVariants[status] || 'outline'} className="ml-2">
            {status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
            {statusLabels[status] || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          {formatDate(createdAt)}
        </div>
      </CardContent>
    </Card>
  )
}
