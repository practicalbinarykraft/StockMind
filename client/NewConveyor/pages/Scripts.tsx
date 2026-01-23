import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Calendar, Edit, Film, Trash2 } from 'lucide-react'
import { Script } from '../types'

const mockScripts: Script[] = [
  {
    id: 'script-1',
    newsId: '1',
    newsTitle: 'Новый прорыв в области искусственного интеллекта',
    scenes: [
      { id: 's1', order: 1, text: 'Сцена 1', alternatives: [] },
      { id: 's2', order: 2, text: 'Сцена 2', alternatives: [] },
      { id: 's3', order: 3, text: 'Сцена 3', alternatives: [] },
    ],
    createdAt: '2024-01-12T10:00:00Z',
    updatedAt: '2024-01-12T10:00:00Z',
    status: 'completed',
    sourceType: 'rss',
    sourceName: 'TechCrunch',
    score: 87,
    hasAudio: true,
    hasAvatar: false,
  },
  {
    id: 'script-2',
    newsId: '2',
    newsTitle: 'Космическая миссия достигла новой планеты',
    scenes: [
      { id: 's1', order: 1, text: 'Сцена 1', alternatives: [] },
      { id: 's2', order: 2, text: 'Сцена 2', alternatives: [] },
    ],
    createdAt: '2024-01-11T14:30:00Z',
    updatedAt: '2024-01-11T14:30:00Z',
    status: 'completed',
    sourceType: 'rss',
    sourceName: 'BBC News',
    score: 92,
    hasAudio: false,
    hasAvatar: true,
  },
]

export default function Scripts() {
  const [scripts] = useState<Script[]>(mockScripts)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Готовые сценарии</h2>
        <p className="text-gray-400">Завершенные сценарии, готовые к использованию</p>
      </div>

      <div className="glass rounded-xl p-6 glow-border">
        {scripts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Нет готовых сценариев</p>
            <p className="text-sm mt-2">
              Завершенные сценарии будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="glass rounded-lg p-5 hover:bg-dark-700/50 transition-all border border-dark-700/50 hover:border-primary-500/30 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                        {script.newsTitle}
                      </h4>
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                        Готов
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {script.scenes.length} сцен
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(script.updatedAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mt-2">
                      <span className={script.hasAudio ? 'text-green-400' : 'text-gray-500'}>
                        {script.hasAudio ? '🔊 Аудио ✓' : '🔇 Аудио ✗'}
                      </span>
                      <span className={script.hasAvatar ? 'text-green-400' : 'text-gray-500'}>
                        {script.hasAvatar ? '🎭 Аватар ✓' : '👤 Аватар ✗'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/editor/${script.id}`}
                      className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Film className="w-4 h-4" />
                      Видео-редактор
                    </Link>
                    <Link
                      to={`/draft/${script.id}`}
                      className="px-4 py-2 rounded-lg bg-dark-700/50 hover:bg-dark-700/70 text-gray-300 text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </Link>
                    <button className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
