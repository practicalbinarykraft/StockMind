import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ArrowUpDown, Grid3x3, List } from "lucide-react"
import type { FilterType, ViewMode, SortBy } from "../types"

interface ProjectsToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filter: FilterType
  onFilterChange: (value: FilterType) => void
  sortBy: SortBy
  onSortChange: (value: SortBy) => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
}

const FILTER_OPTIONS = [
  { key: "all", label: "All Projects" },
  { key: "draft", label: "Drafts" },
  { key: "completed", label: "Completed" },
  { key: "deleted", label: "Deleted" },
] as const

export function ProjectsToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: ProjectsToolbarProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск проектов..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters, Sort, and View Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(item.key)}
              data-testid={`button-filter-${item.key}`}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortBy)}>
            <SelectTrigger className="w-[200px] h-8 gap-2">
              <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
              <SelectValue placeholder="Сортировать" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">По дате</SelectItem>
              <SelectItem value="title">Название (A-Z)</SelectItem>
              <SelectItem value="progress">Прогресс (0-100%)</SelectItem>
              <SelectItem value="created">Дата создания</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/50">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className="h-8 px-3"
              data-testid="button-view-grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              className="h-8 px-3"
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
