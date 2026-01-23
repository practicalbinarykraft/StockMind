import { Calendar, ChevronRight } from 'lucide-react'
import type { NewsScript } from '../../types'
import { Badge } from '@/shared/ui/badge'

interface NewsScriptCardProps {
  script: NewsScript
  onClick: () => void
}

const statusLabels = {
  pending: 'Ожидает',
  in_progress: 'В процессе',
  completed: 'Готов к рецензии',
  human_review: 'На рецензии у человека',
}

export function NewsScriptCard({ script, onClick }: NewsScriptCardProps) {
  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'pending': return 'secondary'
      case 'in_progress': return 'default'
      case 'completed': return 'default'
      case 'human_review': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-5 border hover:bg-muted/50 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
              {script.newsTitle}
            </h4>
            <Badge variant={getStatusVariant(script.status)}>
              {statusLabels[script.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Источник: {script.newsSource}</span>
            <span>•</span>
            <span>Итерация {script.currentIteration} из {script.maxIterations}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(script.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  )
}
