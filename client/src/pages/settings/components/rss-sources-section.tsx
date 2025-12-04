import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Rss, RefreshCw, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { useRssSources } from "../hooks/use-rss-sources"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function RssSourcesSection() {
  const {
    rssSources,
    sourcesLoading,
    showDialog,
    setShowDialog,
    form,
    setForm,
    addMutation,
    toggleMutation,
    deleteMutation,
    parseMutation,
  } = useRssSources()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              RSS Sources
            </CardTitle>
            <CardDescription className="mt-2">
              Manage your news RSS feeds. Sources are parsed automatically.
            </CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-rss">
                <Plus className="h-4 w-4" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add RSS Source</DialogTitle>
                <DialogDescription>
                  Add a new RSS feed to automatically parse news articles.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rss-name">Name</Label>
                  <Input
                    id="rss-name"
                    placeholder="AI Discovery"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="input-rss-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rss-url">RSS Feed URL</Label>
                  <Input
                    id="rss-url"
                    type="url"
                    placeholder="https://example.com/feed"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    data-testid="input-rss-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rss-topic">Topic (Optional)</Label>
                  <Input
                    id="rss-topic"
                    placeholder="AI & Tech Trends"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    data-testid="input-rss-topic"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addMutation.mutate()}
                  disabled={!form.name || !form.url || addMutation.isPending}
                  data-testid="button-save-rss"
                >
                  {addMutation.isPending ? "Adding..." : "Add RSS Source"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sourcesLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : rssSources && rssSources.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {rssSources.map((source) => (
              <div
                key={source.id}
                className="p-4 rounded-lg border border-border space-y-3"
                data-testid={`rss-source-${source.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold line-clamp-1">{source.name}</h4>
                    {source.topic && (
                      <p className="text-sm text-muted-foreground">{source.topic}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: source.id, isActive: checked })
                      }
                      data-testid={`switch-rss-${source.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteMutation.mutate(source.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-rss-${source.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      status={(source.parseStatus || 'pending') as "success" | "error" | "pending"}
                      text={
                        source.parseStatus === "success" 
                          ? `${source.itemCount} items` 
                          : source.parseStatus === "error"
                          ? "Error"
                          : source.parseStatus === "parsing"
                          ? "Parsing..."
                          : "Pending"
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5"
                      onClick={() => parseMutation.mutate(source.id)}
                      disabled={parseMutation.isPending || source.parseStatus === "parsing"}
                      data-testid={`button-parse-rss-${source.id}`}
                    >
                      <RefreshCw className={`h-3 w-3 ${parseMutation.isPending ? 'animate-spin' : ''}`} />
                      Parse
                    </Button>
                  </div>
                  
                  {source.parseError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {source.parseError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {source.parseStatus === "success" && source.itemCount === 0 && (
                    <Alert className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Парсинг прошел успешно, но items не были сохранены. Проверьте логи сервера.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {source.lastParsed
                      ? `Parsed ${formatDistanceToNow(new Date(source.lastParsed), { addSuffix: true, locale: ru })}`
                      : "Not parsed yet"}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground truncate" title={source.url}>
                  {source.url}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Rss className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No RSS sources configured yet. Add your first source to start parsing news.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
