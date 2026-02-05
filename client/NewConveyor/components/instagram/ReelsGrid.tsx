import { useState, useMemo } from 'react'
import { Reel } from '../../types'
import { ReelCard } from './ReelCard'
import { Eye, Heart, MessageCircle, Calendar, ArrowUpDown, TrendingUp, Loader2 } from 'lucide-react'
import { Select, SelectItem } from '../ui/Select'
import { transcribeReel, analyzeReel } from '../../lib/services/instagram'

type SortOption = 'newest' | 'oldest' | 'views' | 'likes' | 'comments'

interface ReelsGridProps {
  reels: Reel[]
  loading?: boolean
}

export function ReelsGrid({ reels, loading = false }: ReelsGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [transcribing, setTranscribing] = useState<string | null>(null)
  const [transcribedReels, setTranscribedReels] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  // Сортировка Reels
  const sortedReels = useMemo(() => {
    const sorted = [...reels]
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.publishedDate || 0).getTime() - new Date(a.publishedDate || 0).getTime()
        )
      case 'oldest':
        return sorted.sort((a, b) =>
          new Date(a.publishedDate || 0).getTime() - new Date(b.publishedDate || 0).getTime()
        )
      case 'views':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0))
      case 'likes':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
      case 'comments':
        return sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0))
      default:
        return sorted
    }
  }, [reels, sortBy])

  const handleTranscribe = async (reelId: string) => {
    setTranscribing(reelId)
    try {
      await transcribeReel(reelId)
      setTranscribedReels((prev) => new Set(prev).add(reelId))
    } catch (error) {
      console.error('Ошибка транскрипции:', error)
      alert('Не удалось выполнить транскрипцию')
    } finally {
      setTranscribing(null)
    }
  }

  const handleAnalyze = async (reelId: string) => {
    setAnalyzing(reelId)
    try {
      await analyzeReel(reelId)
      alert('Анализ завершен')
    } catch (error) {
      console.error('Ошибка анализа:', error)
      alert('Не удалось выполнить анализ')
    } finally {
      setAnalyzing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Нет Reels. Синхронизируйте профиль, чтобы загрузить Reels.</p>
      </div>
    )
  }

  return (
    <>
      {/* Панель фильтрации */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-dark-700/50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <TrendingUp className="h-4 w-4" />
          <span>{reels.length} Reels</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
            className="w-[180px]"
          >
            <SelectItem value="newest">
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Сначала новые
              </span>
            </SelectItem>
            <SelectItem value="oldest">
              <span className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Сначала старые
              </span>
            </SelectItem>
            <SelectItem value="views">
              <span className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                По просмотрам
              </span>
            </SelectItem>
            <SelectItem value="likes">
              <span className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5" />
                По лайкам
              </span>
            </SelectItem>
            <SelectItem value="comments">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5" />
                По комментариям
              </span>
            </SelectItem>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedReels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            onTranscribe={handleTranscribe}
            onAnalyze={handleAnalyze}
            isTranscribing={transcribing === reel.id}
            isTranscribed={transcribedReels.has(reel.id)}
          />
        ))}
      </div>
    </>
  )
}
