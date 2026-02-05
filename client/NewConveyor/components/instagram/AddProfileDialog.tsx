import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { addInstagramProfile } from '../../lib/services/instagram'

interface AddProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddProfileDialog({ open, onOpenChange, onSuccess }: AddProfileDialogProps) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    try {
      await addInstagramProfile(username)
      setUsername('')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass rounded-xl p-6 glow-border max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Добавить Instagram профиль</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Введите username профиля для отслеживания
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace('@', ''))}
            placeholder="@username"
            disabled={loading}
            label="Username"
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !username.trim()} variant="primary" isLoading={loading}>
              Добавить
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
