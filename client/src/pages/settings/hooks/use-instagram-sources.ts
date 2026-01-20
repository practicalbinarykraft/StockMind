import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/shared/api"
import { isUnauthorizedError } from "@/lib/auth-utils"
import type { InstagramSource } from "@shared/schema"

// Типы для лимитов парсинга
interface InstagramLimits {
  autoParseOnAdd: number;
  checkNow: number;
  maxAutoScore: number;
}

export function useInstagramSources() {
  const { toast } = useToast()

  // State
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({
    username: "",
    description: "",
    autoUpdateEnabled: false,
    checkIntervalHours: 6,
    notifyNewReels: false,
    notifyViralOnly: false,
    viralThreshold: 70,
  })

  // Track which source is currently being checked
  const [checkingSourceId, setCheckingSourceId] = useState<string | null>(null)

  // Fetch Instagram Limits
  const { data: limitsData } = useQuery<{ limits: InstagramLimits }>({
    queryKey: ["/api/instagram/limits"],
  })
  const limits = limitsData?.limits

  // Track polling for parsing sources
  const pollingCountRef = useRef(0)
  const maxPollingAttempts = 15 // Max 15 attempts (7.5 minutes)

  // Fetch Instagram Sources
  const { data: instagramSources, isLoading: instagramLoading } = useQuery<InstagramSource[]>({
    queryKey: ["/api/settings/instagram-sources"],
    // Smart polling: only when sources are parsing, max 15 attempts
    refetchInterval: (query) => {
      const data = query.state.data
      const hasParsing = data?.some((source: InstagramSource) => source.parseStatus === 'parsing')
      
      if (!hasParsing) {
        pollingCountRef.current = 0 // Reset counter when no parsing
        return false
      }
      
      // Stop after 15 attempts (7.5 minutes total)
      if (pollingCountRef.current >= maxPollingAttempts) {
        pollingCountRef.current = 0
        return false
      }
      
      pollingCountRef.current++
      return 30000 // Poll every 30 seconds
    },
  })

  // Reset polling counter when sources change
  useEffect(() => {
    const hasParsing = instagramSources?.some(source => source.parseStatus === 'parsing')
    if (!hasParsing) {
      pollingCountRef.current = 0
    }
  }, [instagramSources])

  // Common error handler
  const handleError = (error: Error, title: string) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      })
      setTimeout(() => window.location.href = "/api/login", 500)
      return
    }
    toast({ title, description: error.message, variant: "destructive" })
  }

  // Add Instagram Source Mutation
  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/instagram-sources", {
      username: form.username,
      description: form.description || null,
      autoUpdateEnabled: form.autoUpdateEnabled,
      checkIntervalHours: form.checkIntervalHours,
      notifyNewReels: form.notifyNewReels,
      notifyViralOnly: form.notifyViralOnly,
      viralThreshold: form.viralThreshold,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      setShowDialog(false)
      setForm({
        username: "", description: "", autoUpdateEnabled: false,
        checkIntervalHours: 6, notifyNewReels: false,
        notifyViralOnly: false, viralThreshold: 70,
      })
      toast({
        title: "Instagram Source Added",
        description: "Automatic parsing started. This usually takes 1-3 minutes.",
      })
    },
    onError: (error: Error) => handleError(error, "Error"),
  })

  // Delete Instagram Source Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/instagram-sources/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      toast({ title: "Instagram Source Deleted", description: "The Instagram source has been removed." })
    },
    onError: (error: Error) => handleError(error, "Error"),
  })

  // Check Instagram Now Mutation
  const checkNowMutation = useMutation({
    mutationFn: (id: string) => {
      setCheckingSourceId(id)
      return apiRequest("POST", `/api/instagram/sources/${id}/check-now`, {})
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/instagram-sources"] })
      setCheckingSourceId(null)
      const newReelsCount = data.newReelsCount ?? 0;
      const viralReelsCount = data.viralReelsCount ?? 0;
      const message = viralReelsCount > 0
        ? `Found ${newReelsCount} new Reels (${viralReelsCount} viral).`
        : `Found ${newReelsCount} new Reels.`;
      toast({ title: "Manual Check Complete", description: message })
    },
    onError: (error: Error) => {
      setCheckingSourceId(null)
      handleError(error, "Check Failed")
    },
  })

  return {
    instagramSources,
    instagramLoading,
    showDialog,
    setShowDialog,
    form,
    setForm,
    addMutation,
    deleteMutation,
    checkNowMutation,
    checkingSourceId, // ID источника, который проверяется сейчас
    // Лимиты для отображения в UI
    limits,
  }
}
