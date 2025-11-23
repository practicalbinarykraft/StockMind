import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, GitCompareArrows, CheckCircle, X, Info } from "lucide-react"

interface CandidateVersionBannerProps {
  candidate: any
  reanalyzeJobId: string | null
  acceptMutation: any
  rejectMutation: any
  handleOpenCompare: () => void
}

export function CandidateVersionBanner({
  candidate,
  reanalyzeJobId,
  acceptMutation,
  rejectMutation,
  handleOpenCompare
}: CandidateVersionBannerProps) {
  return (
    <Card className="border-primary/50 bg-primary/5" data-testid="banner-candidate">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Info className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                Новая версия v{candidate.versionNumber} сохранена
              </p>
              <p className="text-sm text-muted-foreground">
                {reanalyzeJobId ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Анализ выполняется...
                  </span>
                ) : (
                  candidate.metrics ? "Анализ завершён" : "Ожидание анализа"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCompare}
              disabled={!candidate.metrics || reanalyzeJobId !== null}
              data-testid="button-compare-banner"
            >
              <GitCompareArrows className="h-4 w-4 mr-2" />
              Сравнить
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => acceptMutation.mutate(candidate.id)}
              disabled={acceptMutation.isPending || !candidate.metrics || reanalyzeJobId !== null}
              data-testid="button-accept-banner"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Принимаем...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Принять
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => rejectMutation.mutate(candidate.id)}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-banner"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
