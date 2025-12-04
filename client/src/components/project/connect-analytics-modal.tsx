import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/query-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Instagram, Music, Youtube, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ConnectAnalyticsModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onSuccess?: () => void
}

export function ConnectAnalyticsModal({
  open,
  onClose,
  projectId,
  onSuccess,
}: ConnectAnalyticsModalProps) {
  const { toast } = useToast()
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'youtube'>('instagram')
  const [postUrl, setPostUrl] = useState("")
  const [updateIntervalHours, setUpdateIntervalHours] = useState(6)
  const [trackingDays, setTrackingDays] = useState(30)

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/analytics/connect`, {
        body: JSON.stringify({
          platform,
          postUrl,
          updateIntervalHours,
          trackingDays,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Аналитика подключена",
        description: "Статистика будет обновляться автоматически",
      })
      onSuccess?.()
      onClose()
      // Reset form
      setPostUrl("")
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка подключения",
        description: error.message || "Не удалось подключить аналитику",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postUrl.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите ссылку на пост",
        variant: "destructive",
      })
      return
    }
    connectMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подключить аналитику</DialogTitle>
          <DialogDescription>
            Отслеживайте просмотры, лайки и комментарии вашего видео
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Выберите платформу</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={platform === 'instagram' ? 'default' : 'outline'}
                onClick={() => setPlatform('instagram')}
                className="flex flex-col items-center gap-2 h-auto py-3"
              >
                <Instagram className="h-5 w-5" />
                <span className="text-xs">Instagram</span>
              </Button>
              <Button
                type="button"
                variant={platform === 'tiktok' ? 'default' : 'outline'}
                onClick={() => setPlatform('tiktok')}
                className="flex flex-col items-center gap-2 h-auto py-3"
              >
                <Music className="h-5 w-5" />
                <span className="text-xs">TikTok</span>
              </Button>
              <Button
                type="button"
                variant={platform === 'youtube' ? 'default' : 'outline'}
                onClick={() => setPlatform('youtube')}
                className="flex flex-col items-center gap-2 h-auto py-3"
              >
                <Youtube className="h-5 w-5" />
                <span className="text-xs">YouTube</span>
              </Button>
            </div>
          </div>

          {/* Post URL */}
          <div className="space-y-2">
            <Label htmlFor="postUrl">Ссылка на опубликованное видео</Label>
            <Input
              id="postUrl"
              placeholder={
                platform === 'instagram' 
                  ? "https://instagram.com/reel/ABC123..."
                  : platform === 'tiktok'
                  ? "https://tiktok.com/@user/video/123..."
                  : "https://youtube.com/shorts/ABC123..."
              }
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              required
            />
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Обновлять каждые</Label>
              <Select 
                value={updateIntervalHours.toString()} 
                onValueChange={(v) => setUpdateIntervalHours(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 час</SelectItem>
                  <SelectItem value="3">3 часа</SelectItem>
                  <SelectItem value="6">6 часов</SelectItem>
                  <SelectItem value="12">12 часов</SelectItem>
                  <SelectItem value="24">24 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Отслеживать</Label>
              <Select 
                value={trackingDays.toString()} 
                onValueChange={(v) => setTrackingDays(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 дней</SelectItem>
                  <SelectItem value="14">14 дней</SelectItem>
                  <SelectItem value="30">30 дней</SelectItem>
                  <SelectItem value="60">60 дней</SelectItem>
                  <SelectItem value="90">90 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            💡 Apify будет автоматически собирать статистику
            <br />
            Стоимость: ~$0.001-0.005 за проверку
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={connectMutation.isPending}>
              {connectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Подключить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

