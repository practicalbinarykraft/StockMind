import { Card, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { Checkbox } from "@/shared/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { Calendar as CalendarComponent } from "@/shared/ui/calendar"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import { RefreshCw, Calendar, Filter, EyeOff, Grid3x3, List, Sparkles } from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { NewsFilters } from "../utils/news-helpers"

interface NewsToolbarProps {
  filters: NewsFilters
  onFilterChange: <K extends keyof NewsFilters>(key: K, value: NewsFilters[K]) => void
  showFilters: boolean
  onToggleFilters: () => void
  viewFormat: "grid" | "list"
  onViewFormatChange: (format: "grid" | "list") => void
  onRefresh: () => void
  onParseExtended: (params: { startDate?: string; endDate?: string }) => void
  onAnalyzeAll?: () => void
  isRefreshing?: boolean
  isParsing?: boolean
  isAnalyzingAll?: boolean
  rssSources?: Array<{ id: string; name: string }>
  filteredNewsCount?: number
}

export function NewsToolbar({
  filters,
  onFilterChange,
  showFilters,
  onToggleFilters,
  viewFormat,
  onViewFormatChange,
  onRefresh,
  onParseExtended,
  onAnalyzeAll,
  isRefreshing,
  isParsing,
  isAnalyzingAll,
  rssSources,
  filteredNewsCount = 0,
}: NewsToolbarProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search articles..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange("searchTerm", e.target.value)}
              data-testid="input-search-news"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => onParseExtended({
              startDate: filters.startDate?.toISOString(),
              endDate: filters.endDate?.toISOString(),
            })}
            disabled={isParsing}
            data-testid="button-parse-extended"
          >
            <Calendar className={`h-4 w-4 mr-2 ${isParsing ? 'animate-spin' : ''}`} />
            Parse Extended
          </Button>

          <Button
            variant="outline"
            onClick={onToggleFilters}
            data-testid="button-toggle-filters"
          >
            {showFilters ? <EyeOff className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            Filters
          </Button>

          {/* View Format Toggle */}
          <ToggleGroup
            type="single"
            value={viewFormat}
            onValueChange={(value) => value && onViewFormatChange(value as "grid" | "list")}
            className="border rounded-md"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid3x3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Analyze All Button (only in list view) */}
          {viewFormat === "list" && filteredNewsCount > 0 && onAnalyzeAll && (
            <Button
              variant="default"
              onClick={onAnalyzeAll}
              disabled={isAnalyzingAll}
              data-testid="button-analyze-all"
            >
              <Sparkles className={`h-4 w-4 mr-2 ${isAnalyzingAll ? 'animate-spin' : ''}`} />
              Проанализировать все статьи
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide-dismissed"
                checked={filters.hideDismissed}
                onCheckedChange={(checked) => onFilterChange("hideDismissed", checked as boolean)}
                data-testid="checkbox-hide-dismissed"
              />
              <label htmlFor="hide-dismissed" className="text-sm">
                Hide Dismissed
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide-used"
                checked={filters.hideUsed}
                onCheckedChange={(checked) => onFilterChange("hideUsed", checked as boolean)}
                data-testid="checkbox-hide-used"
              />
              <label htmlFor="hide-used" className="text-sm">
                Hide Used
              </label>
            </div>

            <div>
              <Label htmlFor="freshness" className="text-xs">Freshness</Label>
              <Select value={filters.freshnessFilter} onValueChange={(value) => onFilterChange("freshnessFilter", value)}>
                <SelectTrigger id="freshness" className="mt-1" data-testid="select-freshness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="hot">Hot (last hour)</SelectItem>
                  <SelectItem value="trending">Trending (last 6h)</SelectItem>
                  <SelectItem value="recent">Recent (last 24h)</SelectItem>
                  <SelectItem value="old">Older</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="min-score" className="text-xs">Min Score</Label>
              <Input
                id="min-score"
                type="number"
                min="0"
                max="100"
                value={filters.minScore}
                onChange={(e) => onFilterChange("minScore", parseInt(e.target.value) || 0)}
                className="mt-1"
                data-testid="input-min-score"
              />
            </div>

            <div>
              <Label htmlFor="source" className="text-xs">Source</Label>
              <Select value={filters.selectedSource} onValueChange={(value) => onFilterChange("selectedSource", value)}>
                <SelectTrigger id="source" className="mt-1" data-testid="select-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {rssSources?.map((source) => (
                    <SelectItem key={source.id} value={source.name}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date" className="text-xs">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !filters.startDate && "text-muted-foreground"
                    )}
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => onFilterChange("startDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="end-date" className="text-xs">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !filters.endDate && "text-muted-foreground"
                    )}
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => onFilterChange("endDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

