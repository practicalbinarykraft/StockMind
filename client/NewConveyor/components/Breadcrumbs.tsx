import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

/**
 * Хлебные крошки для навигации
 */
export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-primary-400 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-primary-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-300">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

