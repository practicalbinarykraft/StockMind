import { Switch, Route } from "wouter";
import { queryClient } from "@/shared/api/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AuthProvider, useAuth } from "@/app/providers/AuthProvider";
import { PrivateRoute, LoginForm } from "@/features/auth/components";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import NewProject from "@/pages/project/new";
import ProjectWorkflow from "@/pages/project/[id]";
import InstagramReels from "@/pages/instagram-reels";
import NewsAll from "@/pages/news/all";
import ScriptsAll from "@/pages/scripts/all";
import ScriptCreate from "@/pages/scripts/create-v2";
import AutoScripts from "@/pages/auto-scripts";
import ConveyorDashboard from "@/pages/conveyor";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={LoginForm} />
      <Route path="/">
        {() =>
          isAuthenticated ? <PrivateRoute component={Home} /> : <Landing />
        }
      </Route>
      <Route path="/settings">
        {() => <PrivateRoute component={Settings} />}
      </Route>
      <Route path="/instagram-reels">
        {() => <PrivateRoute component={InstagramReels} />}
      </Route>
      <Route path="/project/new">
        {() => <PrivateRoute component={NewProject} />}
      </Route>
      <Route path="/project/:id">
        {() => <PrivateRoute component={ProjectWorkflow} />}
      </Route>
      <Route path="/projects/:id">
        {() => <PrivateRoute component={ProjectWorkflow} />}
      </Route>
      <Route path="/news/all">
        {() => <PrivateRoute component={NewsAll} />}
      </Route>
      <Route path="/scripts">
        {() => <PrivateRoute component={ScriptsAll} />}
      </Route>
      <Route path="/scripts/create">
        {() => <PrivateRoute component={ScriptCreate} />}
      </Route>
      <Route path="/auto-scripts">
        {() => <PrivateRoute component={AutoScripts} />}
      </Route>
      <Route path="/conveyor">
        {() => <PrivateRoute component={ConveyorDashboard} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
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
  );
}

export default App;
