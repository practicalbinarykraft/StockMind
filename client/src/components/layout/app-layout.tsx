import { ReactNode } from "react"
import { useSidebar } from "@/hooks/use-sidebar"
import { MainNavigation } from "@/widgets/main-navigation"
import { AppHeader } from "@/widgets/app-header"
import { Button } from "@/components/ui/button"
import { Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, isMobile, toggle, close } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      {/* Header - fixed сверху */}
      <AppHeader />

      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="fixed top-16 left-4 z-50 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Backdrop Overlay (Mobile Only) */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - fixed слева, начинается под header */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col z-40",
          // Width
          isOpen ? "w-64" : "w-16",
          // Mobile: overlay behavior
          isMobile && (isOpen ? "translate-x-0" : "-translate-x-full"),
          // Hide on mobile when closed
          isMobile && !isOpen && "hidden"
        )}
      >
        {/* Sidebar Toggle Button (Desktop) */}
        {!isMobile && (
          <div className="flex items-center justify-end p-2 border-b border-sidebar-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="h-8 w-8"
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        {/* Close Button (Mobile) */}
        {isMobile && (
          <div className="flex items-center justify-end p-2 border-b border-sidebar-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-8 w-8"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation - всегда видна, но показывает только иконки когда закрыта */}
        <div className="flex-1 overflow-y-auto">
          <MainNavigation isOpen={isOpen} />
        </div>
      </aside>

      {/* Main Content - с отступами для header и sidebar */}
      <main
        className={cn(
          "pt-14 transition-all duration-300 min-h-screen",
          // Отступ слева = ширина sidebar
          isOpen ? "pl-64" : "pl-16",
          // Mobile: no left padding when sidebar is closed
          isMobile && !isOpen && "pl-0"
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

