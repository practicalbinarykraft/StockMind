/**
 * Карточка аватара
 * ≤80 строк
 */

import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Check, Play } from 'lucide-react'
import { cn } from '@/shared/utils'
import { getProxiedImageUrl } from '@/features/conveyor/utils/media-proxy'

interface Avatar {
  avatar_id: string
  avatar_name: string
  preview_image_url?: string
  preview_video_url?: string
}

interface AvatarCardProps {
  avatar: Avatar
  isSelected: boolean
  onSelect: () => void
  onPreview?: () => void
}

export function AvatarCard({
  avatar,
  isSelected,
  onSelect,
  onPreview,
}: AvatarCardProps) {
  // Проксируем URL изображения для обхода CORS
  const proxiedImageUrl = getProxiedImageUrl(avatar.preview_image_url)
  
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Изображение аватара */}
        <div className="relative aspect-square bg-muted rounded-md overflow-hidden">
          {proxiedImageUrl ? (
            <img
              src={proxiedImageUrl}
              alt={avatar.avatar_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Нет изображения
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Название */}
        <div className="space-y-2">
          <p className="font-medium text-sm line-clamp-2">{avatar.avatar_name}</p>
          {avatar.preview_video_url && onPreview && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
            >
              <Play className="mr-2 h-3 w-3" />
              Превью
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
