import { useState, useMemo } from "react"
import type { Project } from "@shared/schema"
import type { FilterType, SortBy } from "../types"

interface UseProjectFiltersProps {
  projects: Project[] | undefined
}

/**
 * Hook to manage project filtering and sorting
 */
export function useProjectFilters({ projects }: UseProjectFiltersProps) {
  const [filter, setFilter] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("updated")

  const filteredProjects = useMemo(() => {
    if (!projects) return []

    return projects
      .filter(p => {
        if (filter === "all") return p.status !== "deleted"
        return p.status === filter
      })
      .filter((p: any) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        const title = (p.displayTitle || p.title || "").toLowerCase()
        return title.includes(query)
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "title":
            return (a.displayTitle || a.title || "").localeCompare(b.displayTitle || b.title || "")
          case "progress":
            const progressA = ((a.currentStage - 1) / 7) * 100
            const progressB = ((b.currentStage - 1) / 7) * 100
            return progressB - progressA
          case "created":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          case "updated":
          default:
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        }
      })
  }, [projects, filter, searchQuery, sortBy])

  return {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredProjects,
  }
}
