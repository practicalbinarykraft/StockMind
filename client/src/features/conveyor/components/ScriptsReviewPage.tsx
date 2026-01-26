/**
 * Страница рецензирования сценариев
 */

import { useLocation } from 'wouter'
import { ArrowLeft, Sparkles, ArrowRight } from 'lucide-react'
import { useScripts } from '../hooks/use-scripts'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export function ScriptsReviewPage() {
  const [, navigate] = useLocation()
  const { data: scriptsData, isLoading } = useScripts({ status: 'pending' })
  const scripts = scriptsData?.items || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/conveyor')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Сценарии на рецензии</h2>
            <p className="text-muted-foreground text-sm mt-1">Загрузка...</p>
          </div>
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/conveyor')}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Сценарии на рецензии</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {scripts.length} сценариев ожидают вашей оценки
          </p>
        </div>
      </div>

      {/* Scripts List */}
      <Card>
        <CardContent className="p-6">
          {scripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Нет сценариев на рецензии</p>
              <p className="text-sm mt-2">
                Запустите генерацию в разделе "Сценариев написано"
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => {
                const lastIteration = script.iterations?.[script.iterations.length - 1]
                const lastScore = lastIteration?.review?.overallScore

                return (
                  <div
                    key={script.id}
                    onClick={() => navigate(`/conveyor/drafts/${script.id}`)}
                    className="block rounded-lg p-5 border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {script.newsTitle}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Итераций: {script.iterationsCount || script.currentIteration}</span>
                          {lastScore !== undefined && lastScore !== null && (
                            <>
                              <span>•</span>
                              <span className={
                                lastScore >= 8 ? 'text-green-400' :
                                lastScore >= 5 ? 'text-yellow-400' :
                                'text-red-400'
                              }>
                                Оценка: {lastScore}/10
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(script.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{script.newsSource}</Badge>
                          <Badge variant="secondary">На рецензии</Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
