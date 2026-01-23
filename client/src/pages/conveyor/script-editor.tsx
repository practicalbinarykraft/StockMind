import { AppLayout } from '@/layouts'
import { ScriptEditorPage } from '@/features/conveyor/components/ScriptEditorPage'

/**
 * Страница редактора сценария
 */
export default function ScriptEditor() {
  return (
    <AppLayout>
      <ScriptEditorPage />
    </AppLayout>
  )
}
