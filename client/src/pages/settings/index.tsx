import { ApiKeysSection } from './components/api-keys-section'
import { RssSourcesSection } from './components/rss-sources-section'
import { InstagramSourcesSection } from './components/instagram-sources-section'
import { ConveyorSettingsSection } from './components/conveyor-settings-section'
import { InstagramParseDialog } from './components/instagram-parse-dialog'
import { AccountConnection } from '@/components/ig-analytics/account-connection'
import { useInstagramSources } from './hooks/use-instagram-sources'
import { Layout } from '@/components/layout/layout'

export default function Settings() {
  const { handleOpenParseDialog } = useInstagramSources()

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl py-8 space-y-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <ConveyorSettingsSection />
        <ApiKeysSection />
        <RssSourcesSection />
        <InstagramSourcesSection onOpenParseDialog={handleOpenParseDialog} />
        <AccountConnection />
      </div>

      <InstagramParseDialog />
    </Layout>
  )
}
