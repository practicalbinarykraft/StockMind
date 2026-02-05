import { useState } from 'react'
import { NewsScript } from '../../types'
import { NewsScriptCard } from './NewsScriptCard'

interface NewsScriptListProps {
  scripts: NewsScript[]
  onSelectScript: (id: string) => void
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'human_review'

export function NewsScriptList({ scripts, onSelectScript }: NewsScriptListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filteredScripts = scripts.filter(script => {
    if (filter === 'all') return true
    return script.status === filter
  })

  const filterButtons = [
    { value: 'all' as StatusFilter, label: 'Все' },
    { value: 'pending' as StatusFilter, label: 'Ожидает' },
    { value: 'in_progress' as StatusFilter, label: 'В процессе' },
    { value: 'completed' as StatusFilter, label: 'Готов к рецензии' },
    { value: 'human_review' as StatusFilter, label: 'На рецензии' },
  ]

  return (
    <div className="glass rounded-xl p-6 glow-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Список новостей для генерации</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              filter === btn.value
                ? 'bg-primary-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      
      {filteredScripts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Нет новостей для генерации</p>
          {filter !== 'all' && (
            <p className="text-sm mt-2">Попробуйте выбрать другой фильтр</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScripts.map((script) => (
            <NewsScriptCard
              key={script.id}
              script={script}
              onClick={() => onSelectScript(script.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
