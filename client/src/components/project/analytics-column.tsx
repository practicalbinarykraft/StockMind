import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/query-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  Loader2,
  RefreshCw,
  Settings,
  ExternalLink,
  Link as LinkIcon,
  AlertTriangle,
  Instagram,
  Music,
  Youtube,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { ConnectAnalyticsModal } from "./connect-analytics-modal"
import { StatRow } from "@/components/ui/stat-row"
import { PlatformIcon } from "@/components/ui/platform-icon"

interface AnalyticsColumnProps {
  projectId: string
}

export function AnalyticsColumn({ projectId }: AnalyticsColumnProps) {
  const { toast } = useToast()
  const [showConnectModal, setShowConnectModal] = useState(false)

  // Fetch analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ["/api/projects", projectId, "analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/projects/${projectId}/analytics`)
      if (!res.ok) throw new Error("Failed to fetch analytics")
      return res.json()
    },
  })

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/analytics/refresh`)
      if (!res.ok) throw new Error("Failed to refresh analytics")
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Аналитика обновлена",
        description: "Данные успешно обновлены",
      })
      refetch()
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить аналитику",
        variant: "destructive",
      })
    },
  })

  // Состояние: не подключено
  if (!analytics?.connected) {
    return (
      <div className="p-4 border-l flex flex-col items-center justify-center h-full text-center bg-muted/20">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h4 className="font-medium mb-2 text-sm">Аналитика не подключена</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Отслеживайте просмотры, лайки и комментарии вашего видео
        </p>
        <Button 
          size="sm" 
          onClick={() => setShowConnectModal(true)}
          className="gap-2"
        >
          <LinkIcon className="h-3 w-3" />
          Подключить аналитику
        </Button>
        
        <ConnectAnalyticsModal
          open={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          projectId={projectId}
          onSuccess={() => {
            setShowConnectModal(false)
            refetch()
          }}
        />
      </div>
    )
  }

  // Состояние: загрузка
  if (isLoading) {
    return (
      <div className="p-4 border-l flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Загрузка данных...</p>
      </div>
    )
  }

  // Состояние: ошибка
  if (analytics?.status === 'error') {
    return (
      <div className="p-4 border-l flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-xs text-muted-foreground mb-2">Ошибка загрузки</p>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => refetch()}
          className="text-xs"
        >
          Повторить
        </Button>
      </div>
    )
  }

  // Состояние: данные получены
  const stats = analytics.currentStats || {}
  const changes = analytics.changes24h || {}

  return (
    <div className="p-4 border-l flex flex-col h-full bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={analytics.platform} className="h-4 w-4" />
          <span className="font-medium text-sm">Аналитика</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`h-3 w-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex-1 space-y-2 min-h-0 overflow-y-auto">
        <StatRow
          icon={<Eye className="h-3 w-3" />}
          label="Просмотры"
          value={stats.views || 0}
          change={changes.views}
        />
        <StatRow
          icon={<Heart className="h-3 w-3" />}
          label="Лайки"
          value={stats.likes || 0}
          change={changes.likes}
        />
        <StatRow
          icon={<MessageCircle className="h-3 w-3" />}
          label="Комментарии"
          value={stats.comments || 0}
          change={changes.comments}
        />
        <StatRow
          icon={<Share2 className="h-3 w-3" />}
          label="Репосты"
          value={stats.shares || 0}
          change={changes.shares}
        />
        <StatRow
          icon={<Bookmark className="h-3 w-3" />}
          label="Сохранения"
          value={stats.saves || 0}
          change={changes.saves}
        />
      </div>

      {/* Engagement */}
      {stats.engagementRate !== undefined && (
        <div className="mt-3 pt-3 border-t flex-shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Engagement Rate</span>
            <Badge variant={stats.engagementRate > 10 ? "default" : "secondary"} className="text-xs">
              {stats.engagementRate.toFixed(1)}%
            </Badge>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex-shrink-0">
        {analytics.lastFetchedAt && (
          <div>Updated: {formatDistanceToNow(new Date(analytics.lastFetchedAt), { addSuffix: true, locale: ru })}</div>
        )}
        {analytics.nextFetchAt && (
          <div>Next: {formatDistanceToNow(new Date(analytics.nextFetchAt), { addSuffix: true, locale: ru })}</div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs h-7"
          onClick={() => window.open(analytics.postUrl, '_blank')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Открыть
        </Button>
      </div>
    </div>
  )
}

