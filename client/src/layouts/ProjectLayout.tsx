import { ReactNode, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { queryClient } from "@/shared/api"
import { useAuth } from "@/app/providers/AuthProvider"

/**
 * ProjectLayout компонент для страниц проекта
 * Показывает Header + Project Sidebar + Content
 * Используется для: /project/:id/*
 */
interface ProjectLayoutProps {
  children: ReactNode
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { isAuthenticated } = useAuth()

  // Background prefetch of HeyGen avatars for faster Stage 5 loading
  // This is especially important in ProjectLayout since user is close to Stage 5
  useEffect(() => {
    if (!isAuthenticated) return

    // Prefetch avatars immediately in project context (user is likely to reach Stage 5)
    const timeoutId = setTimeout(async () => {
      try {
        console.log('🔄 [ProjectLayout] Prefetching HeyGen avatars in background...')
        await queryClient.prefetchQuery({
          queryKey: ["/api/heygen/avatars", 0], // page 0
          queryFn: async () => {
            const response = await fetch('/api/heygen/avatars?page=0&limit=30', {
              credentials: 'include'
            })
            if (!response.ok) throw new Error('Failed to prefetch avatars')
            return response.json()
          },
          staleTime: 1000 * 60 * 60 * 6, // 6 hours cache
        })
        console.log('✅ [ProjectLayout] HeyGen avatars prefetched successfully')
      } catch (error) {
        // Silent fail - user might not have API key yet
        console.log('ℹ️ [ProjectLayout] HeyGen avatars prefetch skipped')
      }
    }, 1000) // 1 second delay (faster than Layout since user is in project)

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-14">
        {/* Project Sidebar будет добавлен в компоненте страницы */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

