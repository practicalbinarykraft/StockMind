import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, FileText, CheckCircle, Clock, ArrowRight, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { Statistics } from '../types'
import { getScripts } from '../lib/services/scripts'
import { getNews, NewsItem } from '../lib/services/news'

interface ScriptWithMeta {
  id: string
  newsTitle: string
  newsSource: string
  status: string
  currentIteration: number
  iterationsCount?: number
  lastScore?: number | null
  createdAt: string
}

export default function Conveyor() {
  const navigate = useNavigate()

  // State
  const [statistics, setStatistics] = useState<Statistics>({
    parsed: 0,
    analyzed: 0,
    scriptsWritten: 0,
    inReview: 0,
  })
  const [news, setNews] = useState<NewsItem[]>([])
  const [scripts, setScripts] = useState<ScriptWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      setError(null)

      // Загружаем параллельно
      const [scriptsResponse, newsResponse, selectedNews] = await Promise.all([
        getScripts().catch(() => ({ items: [], total: 0 })),
        getNews({ status: 'new', limit: 50 }).catch(() => ({ items: [], total: 0 })),
        getNews({ status: 'selected', limit: 10 }).catch(() => ({ items: [], total: 0 })),
      ])

      // Подсчитываем статистику
      const allScripts = scriptsResponse.items || []
      const inReviewScripts = allScripts.filter(
        (s: any) => s.status === 'human_review' || s.status === 'completed'
      )

      setStatistics({
        parsed: newsResponse.total || 0,
        analyzed: (newsResponse.items || []).filter((n: any) => n.aiScore !== null).length,
        scriptsWritten: allScripts.length,
        inReview: inReviewScripts.length,
      })

      // Сценарии на рецензии (последние 5)
      setScripts(inReviewScripts.slice(0, 5))

      // Отобранные новости
      setNews(selectedNews.items || [])
    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    }
  }, [])

  // Первоначальная загрузка
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await loadData()
      setIsLoading(false)
    }
    init()
  }, [loadData])

  // Обновление
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const stats = [
    {
      label: 'Спарсено новостей',
      value: statistics.parsed,
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Проанализировано',
      value: statistics.analyzed,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Сценариев написано',
      value: statistics.scriptsWritten,
      icon: FileText,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'На рецензии',
      value: statistics.inReview,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ]

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Конвейер</h2>
          <p className="text-gray-400">Отобранные новости и готовые сценарии для рецензии</p>
        </div>
        <div className="glass rounded-xl p-12 glow-border flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-400">Загрузка данных...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Конвейер</h2>
          <p className="text-gray-400">Отобранные новости и готовые сценарии для рецензии</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="glass rounded-xl p-4 glow-border border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isClickable = stat.label === 'Сценариев написано' || stat.label === 'На рецензии'
          const getNavigationPath = () => {
            if (stat.label === 'Сценариев написано') return '/scripts/generation'
            if (stat.label === 'На рецензии') return '/scripts/review'
            return undefined
          }

          return (
            <div
              key={stat.label}
              onClick={isClickable ? () => {
                const path = getNavigationPath()
                if (path) navigate(path)
              } : undefined}
              className={`glass rounded-xl p-6 glow-border hover:scale-105 transition-transform relative overflow-hidden group min-w-0 ${
                isClickable ? 'cursor-pointer' : ''
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-right min-w-0 flex-1 ml-2">
                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-gray-400 mt-1 truncate">{stat.label}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Сценарии на рецензии */}
      <div className="glass rounded-xl p-6 glow-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <Sparkles className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Сценарии на рецензии</h3>
            <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
              {statistics.inReview}
            </span>
          </div>
          <Link
            to="/scripts/review"
            className="px-4 py-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 hover:text-primary-300 transition-all border border-primary-500/30 hover:border-primary-500/50 flex items-center gap-2 text-sm font-medium"
          >
            Смотреть все
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {scripts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Нет сценариев на рецензии</p>
            <p className="text-sm mt-2">Запустите генерацию в разделе "Сценариев написано"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map((script) => (
              <Link
                key={script.id}
                to={`/scripts/generation`}
                className="block glass rounded-lg p-5 hover:bg-dark-700/50 transition-all border border-dark-700/50 hover:border-primary-500/30 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {script.newsTitle}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Итераций: {script.iterationsCount || script.currentIteration}</span>
                      {script.lastScore !== undefined && script.lastScore !== null && (
                        <>
                          <span>•</span>
                          <span className={script.lastScore >= 8 ? 'text-green-400' : script.lastScore >= 5 ? 'text-yellow-400' : 'text-red-400'}>
                            Оценка: {script.lastScore}/10
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(script.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Последние новости */}
      <div className="glass rounded-xl p-6 glow-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Отобранные новости</h3>
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              {news.length}
            </span>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Нет отобранных новостей</p>
            <p className="text-sm mt-2">Добавьте RSS источники и отберите интересные новости</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div
                key={item.id}
                className="glass rounded-lg p-5 border border-dark-700/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      {item.aiScore !== null && item.aiScore >= 70 && (
                        <span className="px-2 py-1 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
                          Score: {item.aiScore}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {item.content || 'Нет описания'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{item.source || 'Неизвестный источник'}</span>
                      <span>•</span>
                      <span>
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                            })
                          : 'Дата неизвестна'}
                      </span>
                      {item.aiScore !== null && (
                        <>
                          <span>•</span>
                          <span className="text-green-400">Проанализировано</span>
                        </>
                      )}
                    </div>
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
