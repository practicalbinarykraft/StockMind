import { AppLayout } from '@/layouts'
import { ScriptGenerationPage } from '@/features/conveyor/components/ScriptGenerationPage'

/**
 * Страница AI-генерации сценариев
 */
export default function ScriptGeneration() {
  return (
    <AppLayout>
      <ScriptGenerationPage />
    </AppLayout>
  )
}
