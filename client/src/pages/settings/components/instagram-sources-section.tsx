import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Instagram, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { useInstagramSources } from "../hooks/use-instagram-sources"
import { InstagramAddDialog } from "./instagram-add-dialog"

interface InstagramSourcesSectionProps {
  onOpenParseDialog: (sourceId: string) => void
}

export function InstagramSourcesSection({ onOpenParseDialog }: InstagramSourcesSectionProps) {
  const {
    instagramSources, instagramLoading, showDialog, setShowDialog,
    form, setForm, addMutation, deleteMutation, checkNowMutation,
  } = useInstagramSources()

  if (instagramLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Instagram Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Instagram Sources
            </CardTitle>
            <CardDescription className="mt-2">
              Manage Instagram accounts to scrape Reels from. Requires Apify API key.
            </CardDescription>
          </div>
          <InstagramAddDialog
            open={showDialog} onOpenChange={setShowDialog}
            form={form} onFormChange={setForm}
            onSubmit={() => addMutation.mutate()}
            isPending={addMutation.isPending}
          />
        </div>
      </CardHeader>
      <CardContent>
        {!instagramSources || instagramSources.length === 0 ? (
          <div className="text-center py-8">
            <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No Instagram sources configured yet. Add your first account to start scraping Reels.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {instagramSources.map((source) => (
              <div key={source.id} className="p-4 rounded-lg border border-border space-y-3" data-testid={`instagram-source-${source.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold line-clamp-1">@{source.username}</h4>
                    {source.description && <p className="text-sm text-muted-foreground">{source.description}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => deleteMutation.mutate(source.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-instagram-${source.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      status={source.parseStatus === 'parsing' ? 'pending' : source.parseStatus as "success" | "error" | "pending"}
                      text={
                        source.parseStatus === "success" ? `${source.itemCount || 0} reels`
                        : source.parseStatus === 'parsing' ? 'Parsing...'
                        : source.parseStatus || 'pending'
                      }
                    />
                  </div>
                  
                  {/* Show skeleton during parsing */}
                  {source.parseStatus === 'parsing' && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  )}
                  
                  {/* Show error only if status is 'error' (not during parsing or success) */}
                  {source.parseStatus === 'error' && source.parseError && (
                    <p className="text-xs text-destructive">{source.parseError}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {source.lastParsed
                      ? `Parsed ${formatDistanceToNow(new Date(source.lastParsed), { addSuffix: true, locale: ru })}`
                      : "Not parsed yet"}
                  </p>
                </div>

                {source.profileUrl && (
                  <p className="text-xs text-muted-foreground truncate" title={source.profileUrl}>{source.profileUrl}</p>
                )}

                <Button
                  variant="outline" size="sm" className="w-full gap-2"
                  onClick={() => checkNowMutation.mutate(source.id)}
                  disabled={checkNowMutation.isPending}
                  data-testid={`button-check-now-${source.id}`}
                >
                  {checkNowMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Проверяю...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" />Check Now</>
                  )}
                </Button>

                <Button
                  variant="default" size="sm" className="w-full gap-2"
                  onClick={() => onOpenParseDialog(source.id)}
                  disabled={source.parseStatus === 'parsing'}
                  data-testid={`button-parse-instagram-${source.id}`}
                >
                  <Instagram className="h-4 w-4" />
                  {source.parseStatus === 'parsing' ? 'Парсинг...' : 'Запустить парсинг Reels'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
