/**
 * Поиск и фильтры для аватаров
 * ≤100 строк
 */

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { RefreshCw, Search } from 'lucide-react'

interface AvatarSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function AvatarSearch({
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
}: AvatarSearchProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени аватара..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Обновить список"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
