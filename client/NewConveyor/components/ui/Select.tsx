import { ReactNode, useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  placeholder?: string
  className?: string
}

export function Select({ value, onValueChange, children, placeholder, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedChild = Array.isArray(children)
    ? children.find((child: any) => child.props.value === value)
    : null

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-dark-700/50 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {selectedChild ? selectedChild.props.children : placeholder || 'Выберите...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg overflow-hidden">
          <div className="py-1">
            {Array.isArray(children) ? (
              children.map((child: any) => (
                <button
                  key={child.props.value}
                  type="button"
                  onClick={() => {
                    onValueChange(child.props.value)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    value === child.props.value
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-gray-300 hover:bg-dark-700/50 hover:text-white'
                  }`}
                >
                  {child.props.children}
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => {
                  onValueChange((children as any).props.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === (children as any).props.value
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-300 hover:bg-dark-700/50 hover:text-white'
                }`}
              >
                {(children as any).props.children}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: ReactNode
}

export function SelectItem({ value, children }: SelectItemProps) {
  return <div data-value={value}>{children}</div>
}
