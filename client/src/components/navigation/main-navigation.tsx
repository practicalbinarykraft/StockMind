import { useLocation } from "wouter"
import { useSidebar } from "@/hooks/use-sidebar"
import { cn } from "@/lib/utils"
import { 
  Home, 
  FolderOpen, 
  Settings, 
  Newspaper,
  Star,
  List,
  Rss,
  Sparkles,
  FileText,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  badge?: number
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    items: [
      { label: "Dashboard", icon: Home, path: "/" },
    ]
  },
  {
    title: "News Hub",
    items: [
      { label: "All Articles", icon: List, path: "/news/all" },
    ]
  },
  {
    title: "Scripts Library",
    items: [
      { label: "All Scripts", icon: FileText, path: "/scripts" },
      { label: "New Script", icon: Plus, path: "/scripts/create" },
    ]
  },
  {
    title: "Projects",
    items: [
      { label: "All Projects", icon: FolderOpen, path: "/" },
    ]
  },
  {
    items: [
      { label: "Settings", icon: Settings, path: "/settings" },
    ]
  },
]

interface MainNavigationProps {
  isOpen?: boolean
}

export function MainNavigation({ isOpen: propIsOpen }: MainNavigationProps = {}) {
  const [location, setLocation] = useLocation()
  const { isOpen: hookIsOpen } = useSidebar()
  // Используем prop если передан, иначе hook
  const isOpen = propIsOpen !== undefined ? propIsOpen : hookIsOpen

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="space-y-6 px-3 py-4">
        {navigation.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && isOpen && (
              <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = location === item.path || 
                                (item.path === "/" && location === "/home")
                
                const button = (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full gap-3",
                      isOpen ? "justify-start" : "justify-center px-0",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    onClick={() => {
                      setLocation(item.path)
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {isOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                )

                if (!isOpen) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </div>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}

