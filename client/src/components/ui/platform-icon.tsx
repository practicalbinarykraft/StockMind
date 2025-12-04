import { BarChart3, Instagram, Music, Youtube } from "lucide-react"

interface PlatformIconProps {
  platform: 'instagram' | 'tiktok' | 'youtube' | string
  className?: string
}

export function PlatformIcon({ platform, className = "h-4 w-4" }: PlatformIconProps) {
  const icons: Record<string, React.ReactNode> = {
    instagram: <Instagram className={className} />,
    tiktok: <Music className={className} />,
    youtube: <Youtube className={className} />,
  }
  
  return icons[platform] || <BarChart3 className={className} />
}

