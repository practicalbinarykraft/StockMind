import { AppLayout } from '@/layouts'
import { DraftsPage } from '@/features/conveyor/components/DraftsPage'

/**
 * Страница черновиков сценариев
 */
export default function Drafts() {
  return (
    <AppLayout>
      <DraftsPage />
    </AppLayout>
  )
}
