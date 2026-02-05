import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, RefreshCw, ExternalLink, Trash2 } from 'lucide-react'
import { InstagramProfile } from '../types'
import { ReelsGrid } from '../components/instagram/ReelsGrid'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import {
  getInstagramProfile,
  syncInstagramReels,
  getReels,
  updateInstagramProfile,
  deleteInstagramProfile,
} from '../lib/services/instagram'

export default function InstagramProfileDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<InstagramProfile | null>(null)
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reelsLoading, setReelsLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (id) {
      loadProfile()
      loadReels()
    }
  }, [id])

  const loadProfile = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getInstagramProfile(id)
      setProfile(data)
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReels = async () => {
    if (!id) return
    try {
      setReelsLoading(true)
      const data = await getReels(id)
      setReels(data)
    } catch (error) {
      console.error('Ошибка загрузки Reels:', error)
    } finally {
      setReelsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!id) return
    setSyncing(true)
    try {
      await syncInstagramReels(id)
      await loadProfile()
      await loadReels()
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      alert('Не удалось синхронизировать профиль')
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!id || !profile) return
    try {
      const updated = await updateInstagramProfile(id, { isFavorite: !profile.isFavorite })
      setProfile(updated)
    } catch (error) {
      console.error('Ошибка обновления:', error)
      alert('Не удалось обновить профиль')
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteInstagramProfile(id)
      navigate('/instagram')
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Не удалось удалить профиль')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Загрузка профиля...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Профиль не найден</p>
        <Button onClick={() => navigate('/instagram')} variant="secondary" className="mt-4">
          Вернуться к профилям
        </Button>
      </div>
    )
  }

  const profileUrl = `https://www.instagram.com/${profile.username}/`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/instagram')}
          className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Профиль Instagram</h2>
          <p className="text-gray-400 text-sm mt-1">@{profile.username}</p>
        </div>
      </div>

      {/* Базовая информация */}
      <div className="glass rounded-xl p-6 glow-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {profile.profilePicUrl ? (
              <img
                src={profile.profilePicUrl}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                @{profile.username}
                {profile.isFavorite && (
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                )}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  size="sm"
                  variant={profile.isFavorite ? 'primary' : 'secondary'}
                  onClick={handleToggleFavorite}
                  leftIcon={<Star className="h-4 w-4" />}
                >
                  {profile.isFavorite ? 'В избранном' : 'В избранное'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSync}
                  disabled={syncing}
                  leftIcon={<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />}
                >
                  {syncing ? 'Синхронизация...' : 'Синхронизировать'}
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть в Instagram
                  </a>
                </Button>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteDialogOpen(true)}
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
          >
            Удалить
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-700/50">
          <div>
            <p className="text-xs text-gray-400 mb-1">Reels</p>
            <p className="text-lg font-semibold text-white">{profile.reelsCount || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Последняя синхронизация</p>
            <p className="text-sm text-gray-300">
              {profile.lastSynced
                ? new Date(profile.lastSynced).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Никогда'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Создан</p>
            <p className="text-sm text-gray-300">
              {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Статус</p>
            <Badge variant="default" className="bg-green-500/20 text-green-400">
              Активен
            </Badge>
          </div>
        </div>
      </div>

      {/* Подсказка о синхронизации */}
      <div className="glass rounded-lg p-4 border border-primary-500/30 bg-primary-500/10">
        <p className="text-sm text-primary-300">
          <strong>Совет:</strong> Если обложки Reels не отображаются, нажмите кнопку "Синхронизировать" выше.
          Это обновит данные всех Reels, включая миниатюры.
        </p>
      </div>

      {/* Список Reels */}
      <div className="glass rounded-xl p-6 glow-border">
        <h3 className="text-lg font-bold text-white mb-4">Reels</h3>
        <ReelsGrid reels={reels} loading={reelsLoading} />
      </div>

      {/* Диалог удаления */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-xl p-6 glow-border max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Удалить профиль?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Это действие нельзя отменить. Все Reels из этого профиля также будут удалены.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
                Отмена
              </Button>
              <Button 
                variant="danger" 
                onClick={handleDelete}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
