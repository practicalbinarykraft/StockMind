/**
 * Страница готовых сценариев
 */

import { useState } from 'react'
import { useLocation } from 'wouter'
import { CheckCircle, Calendar, Edit, Film, Trash2 } from 'lucide-react'
import { useReadyScripts, useScriptActions } from '../hooks/use-scripts'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
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

export function ScriptsPage() {
  const [, navigate] = useLocation()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null)
  
  // Используем useReadyScripts для получения готовых скриптов из scripts_library
  const { data: scriptsData, isLoading } = useReadyScripts()
  const { deleteScript } = useScriptActions()
  const scripts = scriptsData?.items || []

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setScriptToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (scriptToDelete) {
      deleteScript.mutate(scriptToDelete)
    }
    setDeleteDialogOpen(false)
    setScriptToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setScriptToDelete(null)
  }

  // Получить количество сцен из скрипта
  const getScenesCount = (script: typeof scripts[0]) => {
    return script.scenes?.length || 0
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Готовые сценарии</h2>
          <p className="text-muted-foreground">Завершенные сценарии, готовые к использованию</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Готовые сценарии</h2>
        <p className="text-muted-foreground">Завершенные сценарии, готовые к использованию</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {scripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Нет готовых сценариев</p>
              <p className="text-sm mt-2">
                Завершенные сценарии будут отображаться здесь
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="rounded-lg p-5 border hover:bg-muted/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {script.title || script.newsTitle || 'Без названия'}
                        </h4>
                        <Badge variant="default" className="bg-green-500">
                          Готов
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {getScenesCount(script)} сцен
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(script.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                        <span>•</span>
                        {(script.aiScore !== null && script.aiScore !== undefined && script.aiScore > 0) ? (
                          <span className={
                            script.aiScore >= 80 ? 'text-green-400' :
                            script.aiScore >= 50 ? 'text-yellow-400' :
                            'text-red-400'
                          }>
                            Оценка: {script.aiScore}/100
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Оценка: не оценено
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {script.sourceType && (
                          <Badge variant="outline">
                            {script.sourceType === 'rss' ? '📰 RSS' : 
                             script.sourceType === 'instagram' ? '📱 Instagram' : 
                             script.sourceType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => navigate(`/conveyor/editor/${script.id}`)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Button>
                      <Button
                        onClick={(e) => handleDeleteClick(script.id, e)}
                        variant="destructive"
                        size="icon"
                        title="Удалить сценарий"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
            <AlertDialogTitle>Удалить сценарий?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сценарий будет удалён безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={deleteScript.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteScript.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScript.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
