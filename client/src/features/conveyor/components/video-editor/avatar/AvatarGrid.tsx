/**
 * Сетка аватаров с карточками и независимыми пагинациями
 * ≤250 строк
 */

import { useState } from 'react'
import { AvatarCard } from './AvatarCard'
import { AvatarPagination } from './AvatarPagination'
import { Loader2 } from 'lucide-react'

interface Avatar {
  avatar_id: string
  avatar_name: string
  preview_image_url?: string
  preview_video_url?: string
  is_public?: boolean
}

interface AvatarGridProps {
  myAvatars: Avatar[]
  publicAvatars: Avatar[]
  selectedAvatarId: string | null
  onAvatarSelect: (avatarId: string) => void
  onAvatarPreview?: (avatar: Avatar) => void
  isLoading?: boolean
}

const AVATARS_PER_PAGE = 12

export function AvatarGrid({
  myAvatars,
  publicAvatars,
  selectedAvatarId,
  onAvatarSelect,
  onAvatarPreview,
  isLoading = false,
}: AvatarGridProps) {
  const [myAvatarsPage, setMyAvatarsPage] = useState(1)
  const [publicAvatarsPage, setPublicAvatarsPage] = useState(1)

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

  if (myAvatars.length === 0 && publicAvatars.length === 0) {
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

  // Пагинация для "моих аватаров"
  const myAvatarsTotalPages = Math.ceil(myAvatars.length / AVATARS_PER_PAGE)
  const myAvatarsStartIndex = (myAvatarsPage - 1) * AVATARS_PER_PAGE
  const myAvatarsEndIndex = myAvatarsStartIndex + AVATARS_PER_PAGE
  const myAvatarsOnPage = myAvatars.slice(myAvatarsStartIndex, myAvatarsEndIndex)

  // Пагинация для "публичных аватаров"
  const publicAvatarsTotalPages = Math.ceil(publicAvatars.length / AVATARS_PER_PAGE)
  const publicAvatarsStartIndex = (publicAvatarsPage - 1) * AVATARS_PER_PAGE
  const publicAvatarsEndIndex = publicAvatarsStartIndex + AVATARS_PER_PAGE
  const publicAvatarsOnPage = publicAvatars.slice(publicAvatarsStartIndex, publicAvatarsEndIndex)

  return (
    <div className="space-y-8">
      {/* Мои аватары */}
      {myAvatars.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded" />
            Мои аватары
            <span className="text-xs font-normal text-muted-foreground">
              ({myAvatars.length})
            </span>
          </h3>
          
          {/* Сетка карточек */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myAvatarsOnPage.map((avatar) => (
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

          {/* Пагинация для моих аватаров */}
          {myAvatarsTotalPages > 1 && (
            <AvatarPagination
              currentPage={myAvatarsPage}
              totalPages={myAvatarsTotalPages}
              onPageChange={setMyAvatarsPage}
            />
          )}
        </div>
      )}

      {/* Публичные аватары */}
      {publicAvatars.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-1 h-4 bg-muted rounded" />
            Публичные аватары
            <span className="text-xs font-normal text-muted-foreground">
              ({publicAvatars.length})
            </span>
          </h3>
          
          {/* Сетка карточек */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {publicAvatarsOnPage.map((avatar) => (
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

          {/* Пагинация для публичных аватаров */}
          {publicAvatarsTotalPages > 1 && (
            <AvatarPagination
              currentPage={publicAvatarsPage}
              totalPages={publicAvatarsTotalPages}
              onPageChange={setPublicAvatarsPage}
            />
          )}
        </div>
      )}
    </div>
  )
}
