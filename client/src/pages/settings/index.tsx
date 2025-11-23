import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { ApiKeysSection } from './components/api-keys-section'
import { RssSourcesSection } from './components/rss-sources-section'
import { InstagramSourcesSection } from './components/instagram-sources-section'
import { InstagramParseDialog } from './components/instagram-parse-dialog'
import { AccountConnection } from '@/components/ig-analytics/account-connection'
import { useInstagramSources } from './hooks/use-instagram-sources'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function Settings() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { handleOpenParseDialog } = useInstagramSources()

  // Redirect to login if not authenticated (via useEffect to avoid render-time side effects)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Redirecting to login...",
        variant: "destructive",
      })
      setTimeout(() => {
        window.location.href = "/api/login"
      }, 500)
    }
  }, [authLoading, isAuthenticated, toast])

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
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
        <ApiKeysSection />
        <RssSourcesSection />
        <InstagramSourcesSection onOpenParseDialog={handleOpenParseDialog} />
        <AccountConnection />
      </div>

      <InstagramParseDialog />
    </div>
  )
}
