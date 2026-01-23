import { Link, useLocation } from 'react-router-dom'
import { Zap, Settings, FileText, CheckCircle, Instagram, X, Menu } from 'lucide-react'
import { useState } from 'react'

/**
 * Мобильная навигация для маленьких экранов
 */
export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Конвейер', icon: Zap },
    { path: '/instagram', label: 'Instagram', icon: Instagram },
    { path: '/drafts', label: 'Черновики', icon: FileText },
    { path: '/scripts', label: 'Готовые', icon: CheckCircle },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ]

  return (
    <>
      {/* Кнопка открытия меню */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full shadow-lg shadow-primary-500/50 hover:scale-110 transition-transform"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Мобильное меню */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Меню */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong rounded-t-2xl border-t border-dark-700/50 p-4 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Навигация</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/20 to-cyan-500/20 text-primary-400 border border-primary-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}

