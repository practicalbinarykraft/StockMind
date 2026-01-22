import { ProjectLayout } from "@/layouts";
import { ProjectWorkflow } from "@/features/project-workflow/ProjectWorkflow";

/**
 * ProjectPage - страница для работы с проектом
 * Простая сборка layout + feature компонента
 */
export default function ProjectPage() {
  return (
    <ProjectLayout>
      <ProjectWorkflow />
    </ProjectLayout>
  );
}
