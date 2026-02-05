import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, FileText, Clock } from 'lucide-react'
import { Script } from '../types'

// Моковые данные для демонстрации
const mockScripts: Script[] = [
  {
    id: '1',
    newsId: '1',
    newsTitle: 'Новый прорыв в области искусственного интеллекта',
    scenes: [],
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    status: 'review',
    sourceType: 'rss',
    sourceName: 'TechCrunch',
    score: 87,
    hasAudio: false,
    hasAvatar: false,
  },
  {
    id: '2',
    newsId: '2',
    newsTitle: 'Космическая миссия достигла новой планеты',
    scenes: [],
    createdAt: '2024-01-15T10:45:00Z',
    updatedAt: '2024-01-15T10:45:00Z',
    status: 'review',
    sourceType: 'rss',
    sourceName: 'BBC News',
    score: 92,
    hasAudio: false,
    hasAvatar: false,
  },
  {
    id: '3',
    newsId: '3',
    newsTitle: 'Разработка нового лекарства от рака',
    scenes: [],
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
    status: 'review',
    sourceType: 'rss',
    sourceName: 'Science Daily',
    score: 95,
    hasAudio: false,
    hasAvatar: false,
  },
  {
    id: '4',
    newsId: '4',
    newsTitle: 'Открытие новой экзопланеты в обитаемой зоне',
    scenes: [],
    createdAt: '2024-01-14T12:20:00Z',
    updatedAt: '2024-01-14T12:20:00Z',
    status: 'review',
    sourceType: 'rss',
    sourceName: 'Space News',
    score: 88,
    hasAudio: false,
    hasAvatar: false,
  },
  {
    id: '5',
    newsId: '5',
    newsTitle: 'Прорыв в квантовых вычислениях',
    scenes: [],
    createdAt: '2024-01-13T18:10:00Z',
    updatedAt: '2024-01-13T18:10:00Z',
    status: 'review',
    sourceType: 'rss',
    sourceName: 'TechCrunch',
    score: 91,
    hasAudio: false,
    hasAvatar: false,
  },
]

export default function ScriptsReview() {
  const [scripts] = useState<Script[]>(mockScripts)

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Сценарии на рецензии</h2>
          <p className="text-gray-400">Все сценарии, ожидающие рецензии</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 glass rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-300">
                Всего: <span className="text-yellow-400 font-semibold">{scripts.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Список сценариев */}
      {scripts.length === 0 ? (
        <div className="glass rounded-xl p-12 glow-border text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
          <p className="text-gray-400 text-lg">Нет сценариев на рецензии</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scripts.map((script) => (
            <Link
              key={script.id}
              to={`/draft/${script.id}`}
              className="block glass rounded-xl p-6 glow-border hover:bg-dark-700/50 transition-all border border-dark-700/50 hover:border-primary-500/30 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary-500/20">
                      <Sparkles className="w-5 h-5 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white group-hover:text-primary-400 transition-colors">
                      {script.newsTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 ml-12">
                    <span>Сцен: {script.scenes.length}</span>
                    <span>•</span>
                    <span>
                      Создан: {new Date(script.createdAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span>
                      Обновлен: {new Date(script.updatedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
