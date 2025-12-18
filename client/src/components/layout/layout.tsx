import { ReactNode, useEffect } from "react"
import { Header } from "./header"
import { queryClient } from "@/lib/query-client"
import { useAuth } from "@/hooks/use-auth"

/**
 * Layout компонент для обычных страниц (без project sidebar)
 * Используется для: /, /news, /scripts, /settings и т.д.
 */
interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth()

  // Background prefetch of HeyGen avatars for faster Stage 5 loading
  useEffect(() => {
    if (!isAuthenticated) return

    // Prefetch avatars in the background after 3 seconds
    // This ensures they're cached when user reaches Stage 5
    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔄 [Layout] Prefetching HeyGen avatars in background...')
        await queryClient.prefetchQuery({
          queryKey: ["/api/heygen/avatars"],
          staleTime: 1000 * 60 * 60 * 6, // 6 hours cache
        })
        console.log('✅ [Layout] HeyGen avatars prefetched successfully')
      } catch (error) {
        // Silent fail - user might not have API key yet
        console.log('ℹ️ [Layout] HeyGen avatars prefetch skipped')
      }
    }, 3000) // 3 seconds delay to not block initial page load

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-14">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

