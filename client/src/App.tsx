import { Switch, Route } from "wouter"
import { queryClient } from "./lib/query-client"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { useAuth } from "@/hooks/use-auth"
import NotFound from "@/pages/not-found"
import Landing from "@/pages/landing"
import Home from "@/pages/home"
import Settings from "@/pages/settings"
import NewProject from "@/pages/project/new"
import ProjectWorkflow from "@/pages/project/[id]"
import InstagramReels from "@/pages/instagram-reels"
import { LoginForm } from "@/components/auth/login-form"

function Router() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <Switch>
      <Route path="/login" component={LoginForm} />
      <Route path="/" component={isAuthenticated ? Home : Landing} />
      <Route path="/home" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/instagram-reels" component={InstagramReels} />
      <Route path="/project/new" component={NewProject} />
      <Route path="/project/:id" component={ProjectWorkflow} />
      <Route path="/projects/:id" component={ProjectWorkflow} />
      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
