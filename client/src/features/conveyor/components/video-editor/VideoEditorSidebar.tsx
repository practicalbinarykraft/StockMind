/**
 * Боковая панель видео-редактора
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { MediaStatusBadges } from './MediaStatusBadges'
import { ScenesList } from './ScenesList'
import type { Script } from '../../types'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorSidebarProps {
  script: Script
  status: ScriptMediaStatus | undefined
}

export function VideoEditorSidebar({ script, status }: VideoEditorSidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Статус медиа</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaStatusBadges status={status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сцены</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenesList scenes={script.scenes || []} />
        </CardContent>
      </Card>
    </div>
  )
}
