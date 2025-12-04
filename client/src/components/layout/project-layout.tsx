import { ReactNode } from "react"
import { Header } from "./header"

/**
 * ProjectLayout компонент для страниц проекта
 * Показывает Header + Project Sidebar + Content
 * Используется для: /project/:id/*
 */
interface ProjectLayoutProps {
  children: ReactNode
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
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

