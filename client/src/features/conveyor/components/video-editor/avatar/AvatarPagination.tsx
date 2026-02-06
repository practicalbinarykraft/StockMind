/**
 * Пагинация для списка аватаров
 * ≤50 строк
 */

import { Button } from '@/shared/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AvatarPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function AvatarPagination({
  currentPage,
  totalPages,
  onPageChange,
}: AvatarPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-sm text-muted-foreground">
        Страница {currentPage} из {totalPages}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
