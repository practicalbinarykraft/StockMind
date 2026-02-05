import { Calendar, ChevronRight } from 'lucide-react'
import { NewsScript } from '../../types'

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

const statusColors = {
  pending: 'bg-gray-500/20 text-gray-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  human_review: 'bg-yellow-500/20 text-yellow-400',
}

export function NewsScriptCard({ script, onClick }: NewsScriptCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass rounded-lg p-5 hover:bg-dark-700/50 transition-all border border-dark-700/50 hover:border-primary-500/30 cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
              {script.newsTitle}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[script.status]}`}>
              {statusLabels[script.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
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
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  )
}
