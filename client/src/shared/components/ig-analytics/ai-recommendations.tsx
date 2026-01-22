import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface AIRecommendationsProps {
  projectId: string;
}

/**
 * Component for displaying AI-powered recommendations
 * TODO: Implement full functionality
 */
export function AIRecommendations({ projectId }: AIRecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          AI recommendations for project {projectId}
        </p>
      </CardContent>
    </Card>
  );
}
