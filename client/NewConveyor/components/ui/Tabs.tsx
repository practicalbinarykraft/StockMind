import { ReactNode, useState, createContext, useContext } from 'react'

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex gap-2 p-1 bg-dark-700/50 rounded-lg border border-dark-600/50 ${className}`}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  
  const { value: selectedValue, onValueChange } = context
  const isActive = selectedValue === value

  return (
    <button
      onClick={() => onValueChange(value)}
      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
        isActive
          ? 'bg-primary-500 text-white'
          : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
      } ${className}`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  const { value: selectedValue } = context
  if (selectedValue !== value) return null

  return <div className={className}>{children}</div>
}
