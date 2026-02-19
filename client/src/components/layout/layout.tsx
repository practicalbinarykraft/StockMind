import { ReactNode } from "react"
import { Header } from "./header"

/**
 * Layout компонент для обычных страниц (без project sidebar)
 * Используется для: /, /news, /scripts, /settings и т.д.
 */
interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
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

