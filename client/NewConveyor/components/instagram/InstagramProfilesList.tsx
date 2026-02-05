import { useState, useEffect } from 'react'
import { InstagramProfile } from '../../types'
import { InstagramProfileCard } from './InstagramProfileCard'
import { AddProfileDialog } from './AddProfileDialog'
import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import { getInstagramProfiles, syncInstagramReels } from '../../lib/services/instagram'

export function InstagramProfilesList() {
  const [profiles, setProfiles] = useState<InstagramProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const data = await getInstagramProfiles()
      setProfiles(data)
    } catch (error) {
      console.error('Ошибка загрузки профилей:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (profileId: string) => {
    setSyncing(profileId)
    try {
      await syncInstagramReels(profileId)
      await loadProfiles() // Перезагружаем для обновления счетчиков
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      alert('Не удалось синхронизировать профиль')
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Instagram профили</h2>
        <Button onClick={() => setDialogOpen(true)} variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
          Добавить профиль
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <p className="text-gray-400 mb-4">Нет добавленных профилей</p>
          <Button onClick={() => setDialogOpen(true)} variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Добавить первый профиль
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <InstagramProfileCard
              key={profile.id}
              profile={profile}
              onSync={handleSync}
              isSyncing={syncing === profile.id}
            />
          ))}
        </div>
      )}

      <AddProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadProfiles}
      />
    </div>
  )
}
