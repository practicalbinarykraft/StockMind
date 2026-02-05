/**
 * Страница выбора аватара (заглушка для Этапа 4)
 */

import { useParams, useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function VideoEditorAvatar() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!
  const [, navigate] = useLocation()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/conveyor/video-editor/${scriptId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Выбор аватара</h1>
          <p className="text-sm text-muted-foreground">
            Этап 4 - в разработке
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Аватар будет реализован на Этапе 4</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Этот компонент будет содержать:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Выбор аватара из HeyGen</li>
            <li>Генерацию видео</li>
            <li>Polling статуса генерации</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
