import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowRight, Calendar, Edit } from 'lucide-react'
import { Script } from '../types'

const mockDrafts: Script[] = [
  {
    id: 'draft-1',
    newsId: '1',
    newsTitle: 'Новый прорыв в области искусственного интеллекта',
    scenes: [
      { id: 's1', order: 1, text: 'Сцена 1', alternatives: [] },
      { id: 's2', order: 2, text: 'Сцена 2', alternatives: [] },
    ],
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
    status: 'draft',
    sourceType: 'rss',
    sourceName: 'TechCrunch',
    score: 87,
    hasAudio: false,
    hasAvatar: false,
  },
  {
    id: 'draft-2',
    newsId: '2',
    newsTitle: '5 фишек iPhone которые ты не знал',
    scenes: [
      { id: 's1', order: 1, text: 'Сцена 1', alternatives: [] },
    ],
    createdAt: '2024-01-13T10:20:00Z',
    updatedAt: '2024-01-13T10:20:00Z',
    status: 'draft',
    sourceType: 'instagram',
    sourceName: '@techblogger',
    score: 92,
    hasAudio: false,
    hasAvatar: false,
  },
]

export default function Drafts() {
  const [drafts] = useState<Script[]>(mockDrafts)
  const [filter, setFilter] = useState<'all' | 'rss' | 'instagram'>('all')

  const filteredDrafts = drafts.filter(draft => {
    if (filter === 'all') return true
    return draft.sourceType === filter
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Черновики</h2>
        <p className="text-gray-400">Сохраненные сценарии для дальнейшей работы</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('rss')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'rss'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          📰 Новости
        </button>
        <button
          onClick={() => setFilter('instagram')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'instagram'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-700 text-gray-400 hover:text-white'
          }`}
        >
          📱 Instagram
        </button>
      </div>

      <div className="glass rounded-xl p-6 glow-border">
        {drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Нет сохраненных черновиков</p>
            <p className="text-sm mt-2">
              Сохраняйте сценарии при редактировании, чтобы они появились здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrafts.map((draft) => (
              <Link
                key={draft.id}
                to={`/draft/${draft.id}`}
                className="block glass rounded-lg p-5 hover:bg-dark-700/50 transition-all border border-dark-700/50 hover:border-primary-500/30 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">
                        {draft.sourceType === 'rss' ? '📰' : '📱'}
                      </span>
                      <h4 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                        {draft.newsTitle}
                      </h4>
                      <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                        Черновик
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Источник: {draft.sourceName}</span>
                      <span>•</span>
                      <span>Оценка: {draft.score}/100</span>
                      <span>•</span>
                      <span>{draft.scenes.length} сцен</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Edit className="w-5 h-5 text-gray-400 group-hover:text-primary-400 transition-colors" />
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

