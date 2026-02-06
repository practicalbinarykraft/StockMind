/**
 * Сетка аватаров с карточками
 * ≤200 строк
 */

import { AvatarCard } from './AvatarCard'
import { AvatarPagination } from './AvatarPagination'
import { Loader2 } from 'lucide-react'

interface Avatar {
  avatar_id: string
  avatar_name: string
  preview_image_url?: string
  preview_video_url?: string
}

interface AvatarGridProps {
  avatars: Avatar[]
  selectedAvatarId: string | null
  onAvatarSelect: (avatarId: string) => void
  onAvatarPreview?: (avatar: Avatar) => void
  isLoading?: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function AvatarGrid({
  avatars,
  selectedAvatarId,
  onAvatarSelect,
  onAvatarPreview,
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange,
}: AvatarGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузка аватаров...</p>
        </div>
      </div>
    )
  }

  if (avatars.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Аватары не найдены</p>
          <p className="text-xs text-muted-foreground">
            Попробуйте изменить поисковый запрос
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Сетка карточек */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {avatars.map((avatar) => (
          <AvatarCard
            key={avatar.avatar_id}
            avatar={avatar}
            isSelected={avatar.avatar_id === selectedAvatarId}
            onSelect={() => onAvatarSelect(avatar.avatar_id)}
            onPreview={
              onAvatarPreview ? () => onAvatarPreview(avatar) : undefined
            }
          />
        ))}
      </div>

      {/* Пагинация */}
      <AvatarPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
