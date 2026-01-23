import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Download, Mic, User } from 'lucide-react'
import { Script } from '../types'
import Button from '../components/ui/Button'
import { SceneList } from '../components/pipeline/SceneList'
import { Timeline } from '../components/pipeline/Timeline'
import { usePipelineStore } from '../lib/store/pipeline-store'

// Моковые данные для демонстрации
const mockScript: Script = {
  id: '1',
  newsId: '1',
  newsTitle: 'Новый прорыв в области искусственного интеллекта',
  scenes: [
    {
      id: 's1',
      order: 1,
      text: 'Представьте мир, где искусственный интеллект может создавать произведения искусства не хуже человека.',
      alternatives: [],
    },
    {
      id: 's2',
      order: 2,
      text: 'Ученые из Стэнфорда разработали алгоритм, который анализирует миллионы изображений и создает что-то совершенно новое.',
      alternatives: [],
    },
    {
      id: 's3',
      order: 3,
      text: 'Это открытие меняет наше понимание того, что значит быть творческим.',
      alternatives: [],
    },
  ],
  createdAt: '2024-01-15T11:00:00Z',
  updatedAt: '2024-01-15T11:00:00Z',
  status: 'completed',
  sourceType: 'rss',
  sourceName: 'TechCrunch',
  score: 87,
  hasAudio: false,
  hasAvatar: false,
}

export default function Pipeline() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const loadScript = usePipelineStore((state) => state.loadScript)
  const scenes = usePipelineStore((state) => state.scenes)

  // Загружаем сценарий при монтировании
  useEffect(() => {
    // В реальном приложении здесь будет загрузка из API
    loadScript(mockScript)
  }, [id, loadScript])

  const handleExport = () => {
    // Заглушка для экспорта видео
    alert('Экспорт видео будет реализован позже')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 glass-strong border-b border-dark-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/scripts')}
              className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Видео-редактор</h2>
              <p className="text-gray-400 text-sm mt-1">{mockScript.newsTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(`/draft/${id}`)}
              variant="secondary"
              size="md"
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Редактировать
            </Button>
            <Button
              onClick={() => alert('Генерация аудио (ElevenLabs) - будет реализовано')}
              variant="secondary"
              size="md"
              leftIcon={<Mic className="w-4 h-4" />}
            >
              Сгенерировать аудио
            </Button>
            <Button
              onClick={() => alert('Генерация аватара (HeyGen) - будет реализовано')}
              variant="secondary"
              size="md"
              leftIcon={<User className="w-4 h-4" />}
            >
              Сгенерировать аватар
            </Button>
            <Button
              onClick={handleExport}
              disabled={scenes.length === 0}
              variant="primary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Экспорт видео
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* Левая колонка - Timeline внизу */}
        <div className="col-span-1 flex flex-col bg-dark-800/50 rounded-lg p-4 order-2 lg:order-1 min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center mb-4">
            <div className="text-center text-gray-400">
              <p className="text-sm">Превью видео</p>
              <p className="text-xs mt-2">Будет реализовано позже</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Timeline />
          </div>
        </div>

        {/* Правая колонка - Список сцен */}
        <div className="col-span-1 h-full bg-card border border-dark-700/50 rounded-lg flex flex-col order-1 lg:order-2 overflow-hidden min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <SceneList />
          </div>
        </div>
      </div>
    </div>
  )
}
