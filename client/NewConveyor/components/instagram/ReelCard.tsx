import { Reel } from '../../types'
import { Eye, Heart, MessageCircle, Calendar, ExternalLink, Mic, Sparkles, Check, Loader2 } from 'lucide-react'
import Button from '../ui/Button'

interface ReelCardProps {
  reel: Reel
  onTranscribe?: (reelId: string) => void
  onAnalyze?: (reelId: string) => void
  isTranscribing?: boolean
  isTranscribed?: boolean
}

export function ReelCard({ reel, onTranscribe, onAnalyze, isTranscribing = false, isTranscribed = false }: ReelCardProps) {
  const statusColors = {
    new: 'bg-gray-500/20 text-gray-400',
    ready: 'bg-blue-500/20 text-blue-400',
    transcribed: 'bg-green-500/20 text-green-400',
    analyzed: 'bg-purple-500/20 text-purple-400',
  }

  const statusLabels = {
    new: 'Новый',
    ready: 'Готов',
    transcribed: 'Транскрибирован',
    analyzed: 'Проанализирован',
  }

  return (
    <div className="glass rounded-lg overflow-hidden glow-border hover:shadow-lg transition-all">
      <div className="flex flex-row h-full">
        {/* Миниатюра слева */}
        <div className="relative w-32 sm:w-36 md:w-40 flex-shrink-0 bg-dark-700/50 flex items-center justify-center">
          {reel.thumbnailUrl ? (
            <img
              src={reel.thumbnailUrl}
              alt={reel.caption || 'Reel'}
              className="w-full h-auto object-contain max-h-[200px]"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full min-h-[140px] flex items-center justify-center bg-gradient-to-br from-dark-700 to-dark-700/50 text-gray-400">
                      <div class="text-center p-3">
                        <div class="text-2xl mb-1">🎬</div>
                        <p class="text-xs font-medium">Нет обложки</p>
                      </div>
                    </div>
                  `
                }
              }}
            />
          ) : (
            <div className="w-full h-full min-h-[140px] flex items-center justify-center bg-gradient-to-br from-dark-700 to-dark-700/50 text-gray-400">
              <div className="text-center p-3">
                <div className="text-2xl mb-1">🎬</div>
                <p className="text-xs font-medium">Нет обложки</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[reel.status || 'new']}`}>
              {statusLabels[reel.status || 'new']}
            </span>
          </div>
        </div>

        {/* Информация справа */}
        <div className="flex-1 flex flex-col p-4 sm:p-5">
          {/* Описание */}
          <p className="text-sm font-medium line-clamp-3 mb-3 text-gray-200">
            {reel.caption || 'Без описания'}
          </p>

          {/* Статистика */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span>{reel.views?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              <span>{reel.likes?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{reel.comments?.toLocaleString() || '0'}</span>
            </div>
            {reel.publishedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(reel.publishedDate).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-2 mt-auto pt-3 border-t border-dark-700/50">
            <Button
              size="sm"
              variant={isTranscribed ? 'primary' : 'secondary'}
              onClick={() => onTranscribe?.(reel.id)}
              disabled={isTranscribing || isTranscribed}
              leftIcon={
                isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isTranscribed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )
              }
            >
              {isTranscribing ? 'Обработка...' : isTranscribed ? 'Готово' : 'Транскрипция'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAnalyze?.(reel.id)}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Анализ
            </Button>
            {reel.instagramUrl && (
              <Button
                size="sm"
                variant="ghost"
                asChild
              >
                <a
                  href={reel.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
