import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

interface PrivateRouteProps {
  component: React.ComponentType
}

/**
 * PrivateRoute component
 * Protects routes that require authentication
 * Redirects to /login if user is not authenticated
 */
export function PrivateRoute({ component: Component }: PrivateRouteProps) {
  const [, setLocation] = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // Only redirect if we're sure user is not authenticated (not just loading)
    // Add small delay to avoid race conditions during initial page load
    if (!isLoading && !isAuthenticated) {
      const timer = setTimeout(() => {
        setLocation('/login')
      }, 100) // Small delay to allow token to load from localStorage
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, isAuthenticated, setLocation])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Don't render anything if not authenticated (redirect is in progress)
  if (!isAuthenticated) {
    return null
  }

  return <Component />
}

