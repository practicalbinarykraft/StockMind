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
import { ScriptsList } from "@/features/scripts/components"

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

  const handleDelete = (script: any) => {
    // If script is already linked to a project, go to that project
    if (script.id) {
      deleteMutation.mutate(script.id)
    } else {
      // Otherwise create a new project at Stage 3 (script editing)
      toast({
        title: "Не получилось удалить сценарий",
        description: "Невозможно удалить несуществующий сценарий",
      })
    }
  }

  const handleAnalyze = (script: any) => {
    if (script.id) {
      analyzeMutation.mutate(script.id)
    } else {
      // Otherwise create a new project at Stage 3 (script editing)
      toast({
        title: "Не получилось проанализировать сценарий",
        description: "Невозможно проанализировать несуществующий сценарий",
      })
    }
  }

  const handleStartProduction = (script: any) => {
    if (script.projectId) {
      setLocation(`/project/${script.projectId}`)
    } else {
      // Otherwise create a new project at Stage 3 (script editing)
      startProductionMutation.mutate(script.id)
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
      <ScriptsList 
        scripts={scriptsArray} 
        isLoading={isLoading} 
        activeTab={activeTab} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        onAnalyze={handleAnalyze}
        onStartProduction={handleStartProduction}
        onCreate={() => setLocation("/scripts/create")}
        isDeleting={deleteMutation.isPending}
        isAnalyzing={analyzeMutation.isPending}
        isStartingProduction={startProductionMutation.isPending}
      />
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

