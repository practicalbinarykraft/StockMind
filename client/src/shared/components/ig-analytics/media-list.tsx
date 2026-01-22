import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface MediaListProps {
  projectId: string;
}

/**
 * Component for displaying Instagram media analytics
 * TODO: Implement full functionality
 */
export function MediaList({ projectId }: MediaListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Instagram media analytics for project {projectId}
        </p>
      </CardContent>
    </Card>
  );
}
