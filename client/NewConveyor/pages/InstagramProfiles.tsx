import { InstagramProfilesList } from '../components/instagram/InstagramProfilesList'

export default function InstagramProfiles() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Instagram</h2>
        <p className="text-gray-400">Управляйте Instagram профилями для поиска вирусного контента</p>
      </div>

      <InstagramProfilesList />
    </div>
  )
}
