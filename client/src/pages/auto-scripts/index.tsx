import { AppLayout } from "@/layouts";
import { AutoScriptsPage } from "@/features/auto-scripts/components/AutoScriptsPage";

/**
 * AutoScripts - страница ревью автоматических сценариев
 * Простая сборка layout + feature компонента
 */
export default function AutoScripts() {
  return (
    <AppLayout>
      <AutoScriptsPage />
    </AppLayout>
  );
}
