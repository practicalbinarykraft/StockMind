import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/shared/api"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Sparkles,
  Mic,
  Play,
  ArrowRight,
  LayoutIcon,
  Clock,
} from "lucide-react"
import { useLocation } from "wouter"
import { useToast } from "@/shared/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { AppLayout } from "@/layouts"

type ScriptStatus = 'all' | 'draft' | 'analyzed' | 'ready' | 'in_production'

function ScriptsAllContent() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<ScriptStatus>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")

  // Fetch scripts
  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ["/api/scripts", { status: activeTab, source: sourceFilter, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.append('status', activeTab)
      if (sourceFilter !== 'all') params.append('sourceType', sourceFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const res = await apiRequest("GET", `/api/scripts?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch scripts")
      const response = await res.json()
      // Unwrap new API format: { success: true, data: [...] }
      const scriptsArray = response.data || response
      // Ensure it's always an array
      return Array.isArray(scriptsArray) ? scriptsArray : []
    },
  })

  // Delete script mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/scripts/${id}`)
      if (!res.ok) throw new Error("Failed to delete script")
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Сценарий удален",
        description: "Сценарий успешно удален из библиотеки",
      })
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сценарий",
        variant: "destructive",
      })
    },
  })

  // Analyze script mutation
  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/scripts/${id}/analyze`)
      if (!res.ok) throw new Error("Failed to analyze script")
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Анализ завершен",
        description: "Сценарий успешно проанализирован",
      })
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось проанализировать сценарий",
        variant: "destructive",
      })
    },
  })

  // Start production mutation (Stage 4 - Voice)
  const startProductionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/scripts/${id}/start-production`, {
        body: JSON.stringify({ skipToStage: 4 }),
      })
      if (!res.ok) throw new Error("Failed to start production")
      const result = await res.json()
      // Handle both wrapped { success: true, data: project } and direct project responses
      return result.data || result
    },
    onSuccess: (project) => {
      toast({
        title: "Проект создан",
        description: "Переход к озвучке...",
      })
      setLocation(`/project/${project.id}`)
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать проект",
        variant: "destructive",
      })
    },
  })

  // Edit script mutation (Stage 3 - Script editing)
  const editScriptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/scripts/${id}/start-production`, {
        body: JSON.stringify({ skipToStage: 3 }),
      })
      if (!res.ok) throw new Error("Failed to create project for editing")
      const result = await res.json()
      return result.data || result
    },
    onSuccess: (project) => {
      toast({
        title: "Проект создан",
        description: "Переход к редактированию сценария...",
      })
      setLocation(`/project/${project.id}`)
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать проект для редактирования",
        variant: "destructive",
      })
    },
  })

  // Handle edit button click
  const handleEdit = (script: any) => {
    // If script is already linked to a project, go to that project
    if (script.projectId) {
      setLocation(`/project/${script.projectId}`)
    } else {
      // Otherwise create a new project at Stage 3 (script editing)
      editScriptMutation.mutate(script.id)
    }
  }

  // Ensure scripts is always an array
  const scriptsArray = Array.isArray(scripts) ? scripts : []

  // Count scripts by status
  const statusCounts = {
    all: scriptsArray.length,
    draft: scriptsArray.filter((s: any) => s.status === 'draft').length,
    analyzed: scriptsArray.filter((s: any) => s.status === 'analyzed').length,
    ready: scriptsArray.filter((s: any) => s.status === 'ready').length,
    in_production: scriptsArray.filter((s: any) => s.status === 'in_production').length,
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      draft: { label: "✏️ Draft", variant: "outline" },
      analyzed: { label: "🔍 Analyzed", variant: "secondary" },
      ready: { label: "✅ Ready", variant: "default" },
      in_production: { label: "🎬 In Production", variant: "default" },
      completed: { label: "✓ Completed", variant: "default" },
    }
    return variants[status] || { label: status, variant: "outline" as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scripts Library</h1>
          <p className="text-muted-foreground mt-1">
            Управляйте своими сценариями и создавайте проекты
          </p>
        </div>
        <Button onClick={() => setLocation("/scripts/create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Script
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScriptStatus)}>
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({statusCounts.draft})</TabsTrigger>
          <TabsTrigger value="analyzed">Analyzed ({statusCounts.analyzed})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({statusCounts.ready})</TabsTrigger>
          <TabsTrigger value="in_production">In Production ({statusCounts.in_production})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск сценариев..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="rss">News</SelectItem>
            <SelectItem value="reddit">Reddit</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="news_update">News Update</SelectItem>
            <SelectItem value="explainer">Explainer</SelectItem>
            <SelectItem value="hook_story">Hook & Story</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scripts List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : scriptsArray.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет сценариев</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === 'all' 
                ? "Создайте свой первый сценарий"
                : `Нет сценариев со статусом "${activeTab}"`
              }
            </p>
            <Button onClick={() => setLocation("/scripts/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Создать сценарий
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scriptsArray.map((script: any) => {
            const statusBadge = getStatusBadge(script.status)
            const scenes = Array.isArray(script.scenes) ? script.scenes : []
            const firstSceneText = scenes[0]?.text || scenes[0] || ""

            return (
              <Card key={script.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                        {script.aiScore && (
                          <Badge variant="outline">
                            {script.aiScore}/100
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2">
                        {script.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {firstSceneText}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {scenes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <LayoutIcon className="h-3 w-3" />
                        <span>{scenes.length} сцен</span>
                      </div>
                    )}
                    {script.durationSeconds && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{script.durationSeconds}s</span>
                      </div>
                    )}
                    {script.format && (
                      <Badge variant="outline" className="text-xs">
                        {script.format}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(script.updatedAt), { addSuffix: true, locale: ru })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {script.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzeMutation.mutate(script.id)}
                        disabled={analyzeMutation.isPending}
                        className="flex-1"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Анализ
                      </Button>
                    )}
                    {script.status === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => startProductionMutation.mutate(script.id)}
                        disabled={startProductionMutation.isPending}
                        className="flex-1"
                      >
                        <Mic className="h-3 w-3 mr-1" />
                        Озвучить
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(script)}
                      disabled={editScriptMutation.isPending}
                      title={script.projectId ? "Открыть проект" : "Редактировать сценарий"}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(script.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ScriptsAll() {
  return (
    <AppLayout>
      <ScriptsAllContent />
    </AppLayout>
  )
}

