/**
 * Боковая панель видео-редактора
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ScenesList } from './ScenesList'
import type { Script } from '../../types'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorSidebarProps {
  script: Script
  status: ScriptMediaStatus | undefined
}

export function VideoEditorSidebar({ script, status }: VideoEditorSidebarProps) {
  return (
    <Card className="h-full flex flex-col w-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Сцены</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4">
        <ScenesList scenes={script.scenes || []} />
      </CardContent>
    </Card>
  )
}
