import { ApiKeysSection } from "./ApiKeysSection";
import { RssSourcesSection } from "./RssSourcesSection";
import { InstagramSourcesSection } from "./InstagramSourcesSection";
import { ConveyorSettingsSection } from "./conveyor-settings-section";
import { AccountConnection } from "@/features/instagram/components/AccountConnection";

/**
 * SettingsPage - главный компонент страницы настроек
 * Собирает все секции настроек
 */
export function SettingsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <ConveyorSettingsSection />
      <ApiKeysSection />
      <RssSourcesSection />
      <InstagramSourcesSection />
      <AccountConnection />
    </div>
  );
}
