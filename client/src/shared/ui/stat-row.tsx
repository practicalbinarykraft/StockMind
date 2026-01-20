import { Eye, Heart, MessageCircle, Share2, Bookmark } from "lucide-react"

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: number
  change?: number
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function StatRow({ icon, label, value, change }: StatRowProps) {
  const isPositive = change !== undefined && change > 0
  
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-right">
        <div className="font-medium text-sm">{formatNumber(value)}</div>
        {change !== undefined && (
          <div className={`text-xs ${isPositive ? "text-green-500" : change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {isPositive ? '↑' : change < 0 ? '↓' : ''} {change !== 0 ? formatNumber(Math.abs(change)) : '0'}
          </div>
        )}
      </div>
    </div>
  )
}

