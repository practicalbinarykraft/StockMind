import { type Project } from "@shared/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/authUtils"

interface Stage1Props {
  project: Project
  stepData: any
}

export function Stage1SourceSelection({ project }: Stage1Props) {
  const { toast } = useToast()

  const selectSourceMutation = useMutation({
    mutationFn: async (choice: "news" | "custom") => {
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 2,
      })
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 1,
        data: { sourceChoice: choice },
        completedAt: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Content Source</h1>
        <p className="text-lg text-muted-foreground">
          Select how you want to provide content for your video
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all"
          onClick={() => selectSourceMutation.mutate("news")}
          data-testid="card-source-news"
        >
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
              <Newspaper className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>News Articles</CardTitle>
            <CardDescription>
              Browse your RSS feeds and select articles with AI virality scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              disabled={selectSourceMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                selectSourceMutation.mutate("news")
              }}
              data-testid="button-select-news"
            >
              {selectSourceMutation.isPending ? "Selecting..." : "Select News"}
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate active-elevate-2 transition-all"
          onClick={() => selectSourceMutation.mutate("custom")}
          data-testid="card-source-custom"
        >
          <CardHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 mb-4">
              <FileText className="h-6 w-6 text-chart-2" />
            </div>
            <CardTitle>Custom Script</CardTitle>
            <CardDescription>
              Enter your own text or script content to transform into video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              disabled={selectSourceMutation.isPending}
              onClick={(e) => {
                e.stopPropagation()
                selectSourceMutation.mutate("custom")
              }}
              data-testid="button-select-custom"
            >
              {selectSourceMutation.isPending ? "Selecting..." : "Enter Script"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
