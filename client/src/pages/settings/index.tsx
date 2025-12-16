import { ApiKeysSection } from './components/api-keys-section'
import { RssSourcesSection } from './components/rss-sources-section'
import { InstagramSourcesSection } from './components/instagram-sources-section'
import { ConveyorSettingsSection } from './components/conveyor-settings-section'
import { AccountConnection } from '@/components/ig-analytics/account-connection'
import { Layout } from '@/components/layout/layout'

export default function Settings() {
  return (
    <Layout>
      <div className="container mx-auto max-w-6xl py-8 space-y-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <ConveyorSettingsSection />
        <ApiKeysSection />
        <RssSourcesSection />
        <InstagramSourcesSection />
        <AccountConnection />
      </div>
    </Layout>
  )
}
