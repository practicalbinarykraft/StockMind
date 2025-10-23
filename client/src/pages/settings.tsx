import { useState } from "react"
import { useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Key,
  Rss,
  Instagram,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { ApiKey, RssSource, InstagramSource } from "@shared/schema"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { isUnauthorizedError } from "@/lib/authUtils"
import { useAuth } from "@/hooks/useAuth"

const API_PROVIDERS = [
  { value: "openai", label: "OpenAI", description: "For Whisper transcription" },
  { value: "anthropic", label: "Anthropic", description: "For content analysis and rewriting" },
  { value: "elevenlabs", label: "ElevenLabs", description: "For voice generation" },
  { value: "heygen", label: "HeyGen", description: "For avatar video generation" },
  { value: "kieai", label: "Kie.ai", description: "For B-roll footage generation" },
  { value: "apify", label: "Apify", description: "For Instagram scraping and data extraction" },
]

export default function Settings() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showRssDialog, setShowRssDialog] = useState(false)
  const [showInstagramDialog, setShowInstagramDialog] = useState(false)

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "Redirecting to login...",
      variant: "destructive",
    })
    setTimeout(() => {
      window.location.href = "/api/login"
    }, 500)
    return null
  }

  // API Keys State
  const [apiKeyForm, setApiKeyForm] = useState({
    provider: "",
    key: "",
    description: "",
  })
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  // RSS Source State
  const [rssForm, setRssForm] = useState({
    name: "",
    url: "",
    topic: "",
  })

  // Instagram Source State
  const [instagramForm, setInstagramForm] = useState({
    username: "",
    description: "",
  })

  // Instagram Parse Settings Dialog
  const [showParseDialog, setShowParseDialog] = useState(false)
  const [parseSourceId, setParseSourceId] = useState<string | null>(null)
  const [parseMode, setParseMode] = useState<'latest-20' | 'latest-50' | 'latest-100' | 'new-only'>('latest-50')

  // Fetch API Keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/settings/api-keys"],
  })

  // Fetch RSS Sources
  const { data: rssSources, isLoading: sourcesLoading } = useQuery<RssSource[]>({
    queryKey: ["/api/settings/rss-sources"],
  })

  // Fetch Instagram Sources
  const { data: instagramSources, isLoading: instagramLoading } = useQuery<InstagramSource[]>({
    queryKey: ["/api/settings/instagram-sources"],
  })

  // Get selected source for parse dialog
  const selectedParseSource = instagramSources?.find(s => s.id === parseSourceId)

  // Add API Key Mutation
  const addApiKeyMutation = useMutation({
    mutationFn: async () => {
      const provider = API_PROVIDERS.find(p => p.value === apiKeyForm.provider)
      return apiRequest("POST", "/api/settings/api-keys", {
        provider: apiKeyForm.provider,
        key: apiKeyForm.key,
        description: apiKeyForm.description || provider?.description,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] })
      setShowApiKeyDialog(false)
      setApiKeyForm({ provider: "", key: "", description: "" })
      toast({
        title: "API Key Added",
        description: "Your API key has been securely saved.",
      })
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

  // Delete API Key Mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/api-keys/${id}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] })
      toast({
        title: "API Key Deleted",
        description: "The API key has been removed.",
      })
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

  // Test API Key Mutation
  const testApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      // apiRequest already returns parsed JSON, no need to call .json() again
      return await apiRequest("POST", `/api/settings/api-keys/${id}/test`, {})
    },
    onSuccess: (data: any) => {
      toast({
        title: "API Key Test Successful",
        description: data?.message || "The API key is working correctly!",
      })
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
        title: "API Key Test Failed",
        description: error.message || "The API key appears to be invalid",
        variant: "destructive",
      })
    },
  })

  // Add RSS Source Mutation
  const addRssSourceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/rss-sources", rssForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] })
      setShowRssDialog(false)
      setRssForm({ name: "", url: "", topic: "" })
      toast({
        title: "RSS Source Added",
        description: "Parsing will begin automatically.",
      })
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

  // Toggle RSS Source Active
  const toggleRssSourceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/settings/rss-sources/${id}`, { isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] })
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

  // Delete RSS Source Mutation
  const deleteRssSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/rss-sources/${id}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] })
      toast({
        title: "RSS Source Deleted",
        description: "The RSS source has been removed.",
      })
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

  // Add Instagram Source Mutation
  const addInstagramSourceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/instagram-sources", {
        username: instagramForm.username,
        description: instagramForm.description || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      setShowInstagramDialog(false)
      setInstagramForm({ username: "", description: "" })
      toast({
        title: "Instagram Source Added",
        description: "The Instagram account has been added successfully.",
      })
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

  // Delete Instagram Source Mutation
  const deleteInstagramSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/instagram-sources/${id}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      toast({
        title: "Instagram Source Deleted",
        description: "The Instagram source has been removed.",
      })
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

  // Parse Instagram Source Mutation
  const parseInstagramSourceMutation = useMutation({
    mutationFn: async () => {
      if (!parseSourceId) throw new Error("No source selected");
      
      // Convert parseMode to actual settings
      const settings = {
        'latest-20': { resultsLimit: 20, parseMode: 'all' as const },
        'latest-50': { resultsLimit: 50, parseMode: 'all' as const },
        'latest-100': { resultsLimit: 100, parseMode: 'all' as const },
        'new-only': { resultsLimit: 100, parseMode: 'new' as const },
      }[parseMode];
      
      return apiRequest("POST", `/api/instagram/sources/${parseSourceId}/parse`, settings)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      setShowParseDialog(false)
      toast({
        title: "Parsing Complete",
        description: `Successfully parsed ${data.itemCount} Reels (${data.savedCount} new, ${data.skippedCount} duplicates).`,
      })
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
        title: "Parsing Failed",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleOpenParseDialog = (sourceId: string) => {
    setParseSourceId(sourceId)
    setShowParseDialog(true)
    setParseMode('latest-50') // Reset to default
  }

  const maskApiKey = (key: string) => {
    if (!key) return ""
    const length = key.length
    if (length <= 8) return "*".repeat(length)
    return `${key.substring(0, 4)}...${key.substring(length - 4)}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription className="mt-2">
                  Manage your API keys for AI services. All keys are encrypted.
                </CardDescription>
              </div>
              <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-api-key">
                    <Plus className="h-4 w-4" />
                    Add Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add API Key</DialogTitle>
                    <DialogDescription>
                      Add a new API key for an AI service provider.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select
                        value={apiKeyForm.provider}
                        onValueChange={(value) => setApiKeyForm({ ...apiKeyForm, provider: value })}
                      >
                        <SelectTrigger id="provider" data-testid="select-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {API_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="sk-..."
                        value={apiKeyForm.key}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, key: e.target.value })}
                        data-testid="input-api-key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="What this key is used for..."
                        value={apiKeyForm.description}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, description: e.target.value })}
                        rows={2}
                        data-testid="input-description"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addApiKeyMutation.mutate()}
                      disabled={!apiKeyForm.provider || !apiKeyForm.key || addApiKeyMutation.isPending}
                      data-testid="button-save-api-key"
                    >
                      {addApiKeyMutation.isPending ? "Saving..." : "Save API Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {keysLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border"
                    data-testid={`api-key-${key.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold capitalize">{key.provider}</h4>
                        {key.isActive && (
                          <StatusBadge status="success" text="Active" />
                        )}
                      </div>
                      {key.description && (
                        <p className="text-sm text-muted-foreground mb-2">{key.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono px-2 py-1 bg-muted rounded">
                          {showKey[key.id] ? key.encryptedKey : maskApiKey(key.encryptedKey)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })}
                          data-testid={`button-toggle-key-${key.id}`}
                        >
                          {showKey[key.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {formatDistanceToNow(new Date(key.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.provider === 'anthropic' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => testApiKeyMutation.mutate(key.id)}
                          disabled={testApiKeyMutation.isPending}
                          data-testid={`button-test-key-${key.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteApiKeyMutation.mutate(key.id)}
                        disabled={deleteApiKeyMutation.isPending}
                        data-testid={`button-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No API keys configured yet. Add your first key to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RSS Sources Section */}
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
              <Dialog open={showRssDialog} onOpenChange={setShowRssDialog}>
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
                        value={rssForm.name}
                        onChange={(e) => setRssForm({ ...rssForm, name: e.target.value })}
                        data-testid="input-rss-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rss-url">RSS Feed URL</Label>
                      <Input
                        id="rss-url"
                        type="url"
                        placeholder="https://example.com/feed"
                        value={rssForm.url}
                        onChange={(e) => setRssForm({ ...rssForm, url: e.target.value })}
                        data-testid="input-rss-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rss-topic">Topic (Optional)</Label>
                      <Input
                        id="rss-topic"
                        placeholder="AI & Tech Trends"
                        value={rssForm.topic}
                        onChange={(e) => setRssForm({ ...rssForm, topic: e.target.value })}
                        data-testid="input-rss-topic"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addRssSourceMutation.mutate()}
                      disabled={!rssForm.name || !rssForm.url || addRssSourceMutation.isPending}
                      data-testid="button-save-rss"
                    >
                      {addRssSourceMutation.isPending ? "Adding..." : "Add RSS Source"}
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
                            toggleRssSourceMutation.mutate({ id: source.id, isActive: checked })
                          }
                          data-testid={`switch-rss-${source.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteRssSourceMutation.mutate(source.id)}
                          disabled={deleteRssSourceMutation.isPending}
                          data-testid={`button-delete-rss-${source.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={source.parseStatus as "success" | "error" | "pending"}
                          text={source.parseStatus === "success" ? `${source.itemCount} items` : source.parseStatus || 'pending'}
                        />
                      </div>
                      {source.parseError && (
                        <p className="text-xs text-destructive">{source.parseError}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {source.lastParsed
                          ? `Parsed ${formatDistanceToNow(new Date(source.lastParsed), { addSuffix: true })}`
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

        {/* Instagram Sources Section */}
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
              <Dialog open={showInstagramDialog} onOpenChange={setShowInstagramDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-instagram">
                    <Plus className="h-4 w-4" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Instagram Account</DialogTitle>
                    <DialogDescription>
                      Add an Instagram username to scrape Reels content.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram-username">Instagram Username</Label>
                      <Input
                        id="instagram-username"
                        placeholder="например: techcrunch"
                        value={instagramForm.username}
                        onChange={(e) => setInstagramForm({ ...instagramForm, username: e.target.value })}
                        data-testid="input-instagram-username"
                      />
                      <p className="text-xs text-muted-foreground">
                        Введите только имя пользователя без @ и без ссылки.<br />
                        Пример: для профиля instagram.com/techcrunch введите: <code className="px-1 py-0.5 bg-muted rounded">techcrunch</code>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram-description">Description (Optional)</Label>
                      <Textarea
                        id="instagram-description"
                        placeholder="Tech news & updates"
                        value={instagramForm.description}
                        onChange={(e) => setInstagramForm({ ...instagramForm, description: e.target.value })}
                        data-testid="input-instagram-description"
                        rows={3}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addInstagramSourceMutation.mutate()}
                      disabled={!instagramForm.username || addInstagramSourceMutation.isPending}
                      data-testid="button-save-instagram"
                    >
                      {addInstagramSourceMutation.isPending ? "Adding..." : "Add Instagram Account"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {instagramLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : instagramSources && instagramSources.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {instagramSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-4 rounded-lg border border-border space-y-3"
                    data-testid={`instagram-source-${source.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold line-clamp-1">@{source.username}</h4>
                        {source.description && (
                          <p className="text-sm text-muted-foreground">{source.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteInstagramSourceMutation.mutate(source.id)}
                          disabled={deleteInstagramSourceMutation.isPending}
                          data-testid={`button-delete-instagram-${source.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={
                            source.parseStatus === 'parsing' 
                              ? 'pending' 
                              : source.parseStatus as "success" | "error" | "pending"
                          }
                          text={
                            source.parseStatus === "success" 
                              ? `${source.itemCount} reels` 
                              : source.parseStatus === 'parsing'
                              ? 'Parsing...'
                              : source.parseStatus || 'pending'
                          }
                        />
                      </div>
                      {source.parseError && (
                        <p className="text-xs text-destructive">{source.parseError}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {source.lastParsed
                          ? `Parsed ${formatDistanceToNow(new Date(source.lastParsed), { addSuffix: true })}`
                          : "Not parsed yet"}
                      </p>
                    </div>

                    {source.profileUrl && (
                      <p className="text-xs text-muted-foreground truncate" title={source.profileUrl}>
                        {source.profileUrl}
                      </p>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleOpenParseDialog(source.id)}
                      disabled={source.parseStatus === 'parsing'}
                      data-testid={`button-parse-instagram-${source.id}`}
                    >
                      <Instagram className="h-4 w-4" />
                      {source.parseStatus === 'parsing' ? 'Парсинг...' : 'Запустить парсинг Reels'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Instagram className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No Instagram sources configured yet. Add your first account to start scraping Reels.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instagram Parse Settings Dialog */}
      <Dialog open={showParseDialog} onOpenChange={setShowParseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Что парсить из @{selectedParseSource?.username}?</DialogTitle>
            <DialogDescription>
              Выберите режим парсинга - дубликаты пропускаются автоматически
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                  parseMode === 'latest-20' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setParseMode('latest-20')}
                data-testid="option-latest-20"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    parseMode === 'latest-20' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {parseMode === 'latest-20' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Последние 20 Reels</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Быстрая проверка новых Reels • ~$0.30 Apify
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                  parseMode === 'latest-50' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setParseMode('latest-50')}
                data-testid="option-latest-50"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    parseMode === 'latest-50' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {parseMode === 'latest-50' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Последние 50 Reels</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Оптимальный вариант • ~$0.70 Apify
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                  parseMode === 'latest-100' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setParseMode('latest-100')}
                data-testid="option-latest-100"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    parseMode === 'latest-100' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {parseMode === 'latest-100' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Последние 100 Reels</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Полная загрузка архива • ~$1.30 Apify
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                  parseMode === 'new-only' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setParseMode('new-only')}
                data-testid="option-new-only"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    parseMode === 'new-only' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {parseMode === 'new-only' && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Только новые с последнего раза</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedParseSource?.lastScrapedDate 
                        ? `Reels новее ${formatDistanceToNow(new Date(selectedParseSource.lastScrapedDate), { addSuffix: true })} • Макс 100 шт`
                        : 'Первый парсинг - загрузит до 100 Reels • ~$1.30 Apify'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-md text-sm">
              <p className="font-medium mb-2">📦 Что будет загружено:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>✓ Видео и превью (сохраняются локально)</li>
                <li>✓ Описание, хэштеги, упоминания</li>
                <li>✓ Статистика (лайки, просмотры, комментарии)</li>
                <li>✓ Автоматическая транскрипция речи (OpenAI Whisper)</li>
                <li>✓ AI-анализ вирусности (Anthropic Claude)</li>
                <li>✓ Дубликаты пропускаются автоматически</li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={() => parseInstagramSourceMutation.mutate()}
              disabled={parseInstagramSourceMutation.isPending}
              data-testid="button-start-parsing"
            >
              {parseInstagramSourceMutation.isPending ? 'Запуск парсинга...' : 'Начать парсинг'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
