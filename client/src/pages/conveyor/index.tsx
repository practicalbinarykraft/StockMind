import { AppLayout } from "@/layouts";
import { ConveyorDashboard } from "@/features/conveyor/components/ConveyorDashboard";

/**
 * Conveyor - страница Content Factory (конвейер)
 * Простая сборка layout + feature компонента
 */
export default function Conveyor() {
  return (
    <AppLayout>
      <ConveyorDashboard />
    </AppLayout>
  );
}
