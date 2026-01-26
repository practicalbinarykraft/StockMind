/**
 * Страница готовых сценариев
 */

import { useLocation } from 'wouter'
import { CheckCircle, Calendar, Edit, Film, Trash2 } from 'lucide-react'
import { useReadyScripts, useScriptActions } from '../hooks/use-scripts'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export function ScriptsPage() {
  const [, navigate] = useLocation()
  // Используем useReadyScripts для получения готовых скриптов из scripts_library
  const { data: scriptsData, isLoading } = useReadyScripts()
  const { deleteScript } = useScriptActions()
  const scripts = scriptsData?.items || []

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Вы уверены, что хотите удалить этот сценарий?')) {
      deleteScript.mutate(id)
    }
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
                          {(script as any).title || script.newsTitle || 'Без названия'}
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
                        {((script as any).aiScore !== null && (script as any).aiScore !== undefined) && (
                          <>
                            <span>•</span>
                            <span className={
                              (script as any).aiScore >= 80 ? 'text-green-400' :
                              (script as any).aiScore >= 50 ? 'text-yellow-400' :
                              'text-red-400'
                            }>
                              Оценка: {(script as any).aiScore}/100
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {(script as any).sourceType && (
                          <Badge variant="outline">
                            {(script as any).sourceType === 'rss' ? '📰 RSS' : 
                             (script as any).sourceType === 'instagram' ? '📱 Instagram' : 
                             (script as any).sourceType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => navigate(`/conveyor/drafts/${script.id}`)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Button>
                      <Button
                        onClick={(e) => handleDelete(script.id, e)}
                        variant="destructive"
                        size="icon"
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
    </div>
  )
}
