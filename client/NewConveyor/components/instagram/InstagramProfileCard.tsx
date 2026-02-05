import { Link } from 'react-router-dom'
import { InstagramProfile } from '../../types'
import { Star, RefreshCw, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'

interface InstagramProfileCardProps {
  profile: InstagramProfile
  onSync?: (profileId: string) => void
  isSyncing?: boolean
}

export function InstagramProfileCard({ profile, onSync, isSyncing = false }: InstagramProfileCardProps) {
  return (
    <Link to={`/instagram/${profile.id}`}>
      <div className="glass rounded-lg p-4 glow-border hover:bg-dark-700/50 transition-all cursor-pointer h-full">
        <div className="flex items-center gap-3 mb-3">
          {profile.profilePicUrl ? (
            <img
              src={profile.profilePicUrl}
              alt={profile.username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white truncate">@{profile.username}</h3>
              {profile.isFavorite && (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {profile.lastSynced && (
            <p className="text-sm text-gray-400">
              Обновлено: {new Date(profile.lastSynced).toLocaleDateString('ru-RU')}
            </p>
          )}
          <p className="text-sm text-gray-400">
            Reels: <span className="text-white font-medium">{profile.reelsCount || 0}</span>
          </p>
        </div>

        <Button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSync?.(profile.id)
          }}
          disabled={isSyncing}
          variant="secondary"
          size="sm"
          className="w-full"
          leftIcon={
            isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )
          }
        >
          {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
        </Button>
      </div>
    </Link>
  )
}
