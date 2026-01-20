import { Link, useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Sparkles, Settings, User, Newspaper, FileText, FolderOpen, Factory } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/widgets/app-header"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Header компонент с навигацией вверху
 * Заменяет глобальный вертикальный sidebar
 */
export function Header() {
  const [location, setLocation] = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    setLocation("/login")
  }

  const navItems = [
    { href: "/news/all", label: "News Hub", icon: Newspaper },
    { href: "/scripts", label: "Scripts", icon: FileText },
    { href: "/", label: "Projects", icon: FolderOpen },
    { href: "/conveyor", label: "Content Factory", icon: Factory },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-sidebar-border">
      <div className="flex h-full items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">StockMind</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href || 
                           (item.href === "/" && (location === "/" || location === "/home"))
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side icons */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/settings")}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user && (
                <>
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

