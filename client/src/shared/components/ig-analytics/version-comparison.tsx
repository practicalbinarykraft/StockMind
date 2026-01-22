import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface VersionComparisonProps {
  projectId: string;
}

/**
 * Component for comparing different versions
 * TODO: Implement full functionality
 */
export function VersionComparison({ projectId }: VersionComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Version comparison for project {projectId}
        </p>
      </CardContent>
    </Card>
  );
}
