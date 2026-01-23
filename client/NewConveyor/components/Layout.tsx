import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, Settings, FileText, Sparkles, Menu, X, CheckCircle, Instagram } from 'lucide-react'
import MobileNav from './MobileNav'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const navItems = [
    { path: '/', label: 'Конвейер', icon: Zap },
    { path: '/instagram', label: 'Instagram', icon: Instagram },
    { path: '/drafts', label: 'Черновики', icon: FileText },
    { path: '/scripts', label: 'Готовые', icon: CheckCircle },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ]

  return (
    <div className="min-h-screen">
      {/* Header - на всю ширину, логотип зафиксирован слева */}
      <header className="glass-strong border-b border-dark-700/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 group flex-shrink-0">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 via-cyan-500 to-primary-600 glow-border-cyan animate-pulse-slow group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold gradient-text-neon">Content Factory</h1>
                  <p className="text-xs text-gray-500 mt-0.5">AI-Powered Reels Creator</p>
                </div>
              </div>
              {/* Кнопка переключения сайдбара */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg glass border border-dark-700/50 hover:border-primary-500/50 hover:bg-dark-700/50 transition-all flex-shrink-0 ml-4 relative"
                title={isSidebarOpen ? 'Скрыть меню' : 'Показать меню'}
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <X 
                  className={`w-5 h-5 text-gray-400 transition-all absolute inset-0 m-auto ${
                    isSidebarOpen 
                      ? 'opacity-100 rotate-0' 
                      : 'opacity-0 rotate-90'
                  }`}
                />
                <Menu 
                  className={`w-5 h-5 text-gray-400 transition-all absolute inset-0 m-auto ${
                    !isSidebarOpen 
                      ? 'opacity-100 rotate-0' 
                      : 'opacity-0 -rotate-90'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 glass rounded-lg border border-primary-500/20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-sm text-gray-300">Система активна</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar Navigation - абсолютно позиционирован поверх контента */}
        <div className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${
          isSidebarOpen ? 'w-[288px]' : 'w-0'
        }`}>
          <div className="pt-[73px] h-full">
            <div className={`h-full pt-6 pl-4 transition-all duration-300 ${
              isSidebarOpen ? 'pr-4 opacity-100' : 'pr-0 opacity-0'
            }`}>
              <aside className={`h-full transition-all duration-300 ease-in-out ${
                isSidebarOpen 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-full overflow-hidden'
              }`}>
                <nav className={`glass rounded-xl p-3 space-y-1 transition-opacity duration-300 relative ${
                  isSidebarOpen ? 'opacity-100' : 'opacity-0'
                }`}>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 min-h-[48px] ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/20 to-cyan-500/20 text-primary-400 border border-primary-500/40 shadow-lg shadow-primary-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary-400 to-cyan-400 rounded-r-full"></div>
                    )}
                    <Icon className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium whitespace-nowrap flex-1 min-w-0">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary-400 animate-pulse shadow-lg shadow-primary-400/50 flex-shrink-0"></div>
                    )}
                  </Link>
                )
                })}
                </nav>
              </aside>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 py-6 overflow-x-hidden transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[288px]' : 'lg:ml-0'}`}>
          <div className="max-w-7xl mx-auto px-4 w-full">
            <main className="flex-1 min-w-0 animate-fade-in w-full">
              {children}
            </main>
          </div>
        </div>
      </div>
      
      {/* Мобильная навигация */}
      <MobileNav />
    </div>
  )
}

