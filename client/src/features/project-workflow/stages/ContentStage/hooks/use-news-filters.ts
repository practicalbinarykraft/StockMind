import { useState } from "react"
import type { NewsFilters } from "../utils/news-helpers"

/**
 * Hook for managing news filters state
 */
export function useNewsFilters() {
  const [filters, setFilters] = useState<NewsFilters>({
    searchTerm: "",
    hideDismissed: true,
    hideUsed: true,
    freshnessFilter: "all",
    minScore: 0,
    selectedSource: "all",
    startDate: undefined,
    endDate: undefined,
  })

  const [showFilters, setShowFilters] = useState(false)
  const [showAllOldNews, setShowAllOldNews] = useState(false)

  const updateFilter = <K extends keyof NewsFilters>(
    key: K,
    value: NewsFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return {
    filters,
    updateFilter,
    showFilters,
    setShowFilters,
    showAllOldNews,
    setShowAllOldNews,
  }
}

