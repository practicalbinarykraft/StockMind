import { Flame, Zap, Newspaper, Calendar } from "lucide-react"
import type { RssItem } from "@shared/schema"

export interface EnrichedRssItem extends RssItem {
  freshnessLabel: 'hot' | 'trending' | 'recent' | 'old'
  sourceName: string
  score?: number | null
}

export interface NewsFilters {
  searchTerm: string
  hideDismissed: boolean
  hideUsed: boolean
  freshnessFilter: string
  minScore: number
  selectedSource: string
  startDate: Date | undefined
  endDate: Date | undefined
}

/**
 * Get badge configuration for freshness label
 */
export function getBadgeConfig(label: string) {
  switch (label) {
    case 'hot':
      return { icon: Flame, label: 'Hot', variant: 'destructive' as const }
    case 'trending':
      return { icon: Zap, label: 'Trending', variant: 'default' as const }
    case 'recent':
      return { icon: Newspaper, label: 'Recent', variant: 'secondary' as const }
    default:
      return { icon: Calendar, label: 'Old', variant: 'outline' as const }
  }
}

/**
 * Filter news items based on filters
 */
export function filterNews(
  items: EnrichedRssItem[] | undefined,
  filters: NewsFilters
): EnrichedRssItem[] {
  if (!items) return []

  return items.filter(item => {
    const matchesSearch = !filters.searchTerm || 
      item.title.toLowerCase().includes(filters.searchTerm.toLowerCase())
    
    const matchesDismissed = !filters.hideDismissed || 
      item.userAction !== 'dismissed'
    
    const matchesUsed = !filters.hideUsed || 
      item.userAction !== 'selected'
    
    const matchesFreshness = filters.freshnessFilter === 'all' || 
      item.freshnessLabel === filters.freshnessFilter
    
    const matchesScore = !item.aiScore || 
      item.aiScore >= filters.minScore
    
    const matchesSource = filters.selectedSource === 'all' || 
      item.sourceName === filters.selectedSource
    
    // Date range filtering
    let matchesDateRange = true
    if (filters.startDate || filters.endDate) {
      if (!item.publishedAt) {
        matchesDateRange = false
      } else {
        const itemDate = new Date(item.publishedAt)
        
        if (filters.startDate) {
          const start = new Date(filters.startDate)
          start.setHours(0, 0, 0, 0)
          if (itemDate < start) matchesDateRange = false
        }
        
        if (filters.endDate) {
          const end = new Date(filters.endDate)
          end.setHours(23, 59, 59, 999)
          if (itemDate > end) matchesDateRange = false
        }
      }
    }
    
    return matchesSearch && matchesDismissed && matchesUsed && 
           matchesFreshness && matchesScore && matchesSource && matchesDateRange
  })
}

/**
 * Group filtered news by freshness
 */
export function groupNewsByFreshness(filteredNews: EnrichedRssItem[]) {
  return {
    hot: filteredNews.filter(item => item.freshnessLabel === 'hot'),
    trending: filteredNews.filter(item => item.freshnessLabel === 'trending'),
    recent: filteredNews.filter(item => item.freshnessLabel === 'recent'),
    old: filteredNews.filter(item => item.freshnessLabel === 'old'),
  }
}

