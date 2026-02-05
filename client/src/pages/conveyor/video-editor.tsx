import { AppLayout } from '@/layouts'
import { VideoEditorMain } from '@/features/conveyor/components/VideoEditorMain'

/**
 * Главная страница видео-редактора
 */
export default function VideoEditor() {
  return (
    <AppLayout>
      <VideoEditorMain />
    </AppLayout>
  )
}
