/**
 * Страница черновиков сценариев
 */

import { useState } from 'react'
import { useLocation } from 'wouter'
import { FileText, ArrowRight, Edit, Trash2 } from 'lucide-react'
import { useDrafts } from '../hooks/use-scripts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/hooks/use-toast'
import { queryClient } from '@/shared/api'
import { scriptsService } from '../services/scriptsService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'

type FilterType = 'all' | 'rss' | 'instagram'

export function DraftsPage() {
  const [, navigate] = useLocation()
  const [filter, setFilter] = useState<FilterType>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const { data: draftsResponse, isLoading } = useDrafts()
  const scripts = draftsResponse?.items || []

  const filteredScripts = filter === 'all' 
    ? scripts 
    : scripts.filter(script => script.sourceType === filter)

  const handleDeleteClick = (e: React.MouseEvent, scriptId: string) => {
    e.stopPropagation()
    setScriptToDelete(scriptId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!scriptToDelete) return

    setIsDeleting(true)
    try {
      await scriptsService.deleteScript(scriptToDelete)
      
      // Обновляем кэш списка черновиков
      await queryClient.invalidateQueries({ queryKey: ['scripts', 'draft'] })
      
      toast({
        title: 'Успешно',
        description: 'Черновик удалён',
      })
    } catch (error: any) {
      console.error('Error deleting draft:', error)
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить черновик',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setScriptToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setScriptToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Черновики</h2>
          <p className="text-muted-foreground">Сохраненные сценарии для дальнейшей работы</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Черновики</h2>
        <p className="text-muted-foreground">Сохраненные сценарии для дальнейшей работы</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setFilter('all')}
          variant={filter === 'all' ? 'default' : 'outline'}
        >
          Все
        </Button>
        <Button
          onClick={() => setFilter('rss')}
          variant={filter === 'rss' ? 'default' : 'outline'}
        >
          📰 Новости
        </Button>
        <Button
          onClick={() => setFilter('instagram')}
          variant={filter === 'instagram' ? 'default' : 'outline'}
        >
          📱 Instagram
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {filteredScripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Нет сохраненных черновиков</p>
              <p className="text-sm mt-2">
                Сохраняйте сценарии при редактировании, чтобы они появились здесь
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScripts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => navigate(`/conveyor/editor/${draft.id}?mode=draft`)}
                  className="block rounded-lg p-5 border hover:bg-muted/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">
                          {draft.sourceType === 'instagram' ? '📱' : '📰'}
                        </span>
                        <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {draft.newsTitle || draft.title || 'Без названия'}
                        </h4>
                        <Badge variant="secondary">Черновик</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Источник: {draft.sourceName}</span>
                        <span>•</span>
                        <span>Оценка: {draft.score}/100</span>
                        <span>•</span>
                        <span>{draft.scenes.length} сцен</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => handleDeleteClick(e, draft.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Удалить черновик"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Edit className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить черновик?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Черновик будет удалён безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
