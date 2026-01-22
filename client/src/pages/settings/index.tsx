import { AppLayout } from "@/layouts";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

/**
 * Settings - страница настроек приложения
 * Простая сборка layout + feature компонента
 */
export default function Settings() {
  return (
    <AppLayout>
      <SettingsPage />
    </AppLayout>
  );
}
