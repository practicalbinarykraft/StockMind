import { useState, useRef } from 'react'
import { Scene } from '../../types'
import { usePipelineStore } from '../../lib/store/pipeline-store'
import { Trash, ChevronDown, ChevronUp, Image, Video, Upload, Loader2, Sparkles, Volume2, Play, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import Input from '../ui/Input'
import Slider from '../ui/Slider'
import { Select, SelectItem } from '../ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs'

interface SceneCardProps {
  scene: Scene
  index: number
}

export function SceneCard({ scene, index }: SceneCardProps) {
  const { updateScene, removeScene, aspectRatio } = usePipelineStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const imageUploadRef = useRef<HTMLInputElement>(null)
  const videoUploadRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleTextChange = (text: string) => {
    updateScene(scene.id, { text })
  }

  const handleDurationChange = (seconds: number) => {
    const fps = usePipelineStore.getState().fps
    updateScene(scene.id, { durationInFrames: Math.round(seconds * fps) })
  }

  const handleImagePromptChange = (prompt: string) => {
    updateScene(scene.id, { imagePrompt: prompt })
  }

  // Заглушки для генерации
  const handleGenerateImage = async () => {
    if (!scene.imagePrompt) {
      alert('Введите описание изображения')
      return
    }

    setIsGenerating(true)
    updateScene(scene.id, { isGenerating: true })

    // Заглушка API
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // В реальном приложении здесь будет API вызов
    const mockImageUrl = `https://via.placeholder.com/1080x1920/4F46E5/FFFFFF?text=${encodeURIComponent(scene.imagePrompt)}`

    updateScene(scene.id, {
      visualSource: mockImageUrl,
      mediaType: 'image',
      isGenerating: false,
    })
    setIsGenerating(false)
  }

  const handleGenerateVideo = async () => {
    if (!scene.imagePrompt) {
      alert('Введите описание видео')
      return
    }

    setIsGenerating(true)
    updateScene(scene.id, { isGenerating: true })

    // Заглушка API
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // В реальном приложении здесь будет API вызов
    const mockVideoUrl = `https://via.placeholder.com/1080x1920/10B981/FFFFFF?text=Video`

    updateScene(scene.id, {
      visualSource: mockVideoUrl,
      mediaType: 'video',
      isGenerating: false,
    })
    setIsGenerating(false)
  }

  const handleGenerateVideoFromImage = async () => {
    if (!scene.visualSource || scene.mediaType !== 'image') {
      alert('Сначала сгенерируйте или загрузите изображение')
      return
    }

    setIsGenerating(true)
    updateScene(scene.id, { isGenerating: true })

    // Заглушка API
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // В реальном приложении здесь будет API вызов
    const mockVideoUrl = `https://via.placeholder.com/1080x1920/8B5CF6/FFFFFF?text=I2V`

    updateScene(scene.id, {
      visualSource: mockVideoUrl,
      mediaType: 'video',
      isGenerating: false,
    })
    setIsGenerating(false)
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения')
      return
    }

    setIsUploading(true)

    // Заглушка загрузки
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // В реальном приложении здесь будет загрузка на сервер
    const mockUrl = URL.createObjectURL(file)

    updateScene(scene.id, {
      visualSource: mockUrl,
      mediaType: 'image',
    })
    setIsUploading(false)
  }

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Пожалуйста, выберите файл видео')
      return
    }

    setIsUploading(true)

    // Заглушка загрузки
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // В реальном приложении здесь будет загрузка на сервер
    const mockUrl = URL.createObjectURL(file)

    updateScene(scene.id, {
      visualSource: mockUrl,
      mediaType: 'video',
    })
    setIsUploading(false)
  }

  const handleGenerateAudio = async () => {
    if (!scene.text) {
      alert('Введите текст сцены для генерации аудио')
      return
    }

    setIsGeneratingAudio(true)
    updateScene(scene.id, { isGenerating: true })

    // Заглушка API
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // В реальном приложении здесь будет API вызов для генерации речи
    const mockAudioUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSfTQ8OUKjk8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUqgc7y2Yk2CBtpvfDkn00PDlCo5PC2YxwGOJHX8sx5LAUkd8fw3ZBACg=='

    updateScene(scene.id, {
      audioUrl: mockAudioUrl,
      isGenerating: false,
    })
    setIsGeneratingAudio(false)
  }

  const durationInSeconds = (scene.durationInFrames || 90) / usePipelineStore.getState().fps
  const mediaUrl = scene.visualSource
  const mediaType = scene.mediaType || 'image'

  return (
    <div className="glass rounded-lg p-4 glow-border">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-2">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-400">
            {index + 1}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Сцена {scene.order}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-dark-700/50 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => removeScene(scene.id)}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
              >
                <Trash className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          <Textarea
            value={scene.text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Введите текст сцены..."
            className="mb-3"
            rows={3}
          />

          {isExpanded && (
            <div className="space-y-4 pt-3 border-t border-dark-700/50">
              {/* Генерация визуалов */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Визуалы</h4>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'video')}>
                  <TabsList>
                    <TabsTrigger value="image">
                      <Image className="w-4 h-4 mr-2" />
                      Изображение
                    </TabsTrigger>
                    <TabsTrigger value="video">
                      <Video className="w-4 h-4 mr-2" />
                      Видео
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="mt-3 space-y-3">
                    <Textarea
                      value={scene.imagePrompt || ''}
                      onChange={(e) => handleImagePromptChange(e.target.value)}
                      placeholder="Опишите изображение для генерации..."
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !scene.imagePrompt}
                        variant="primary"
                        size="sm"
                        leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      >
                        {isGenerating ? 'Генерация...' : 'Сгенерировать'}
                      </Button>
                      <Button
                        onClick={() => imageUploadRef.current?.click()}
                        disabled={isUploading}
                        variant="secondary"
                        size="sm"
                        leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      >
                        Загрузить
                      </Button>
                      <input
                        ref={imageUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                    </div>
                    {mediaUrl && mediaType === 'image' && (
                      <div className="relative rounded-lg overflow-hidden border border-dark-600/50">
                        <img src={mediaUrl} alt="Scene visual" className="w-full h-auto" />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="video" className="mt-3 space-y-3">
                    <Textarea
                      value={scene.imagePrompt || ''}
                      onChange={(e) => handleImagePromptChange(e.target.value)}
                      placeholder="Опишите видео для генерации..."
                      rows={2}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={handleGenerateVideo}
                        disabled={isGenerating || !scene.imagePrompt}
                        variant="primary"
                        size="sm"
                        leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      >
                        {isGenerating ? 'Генерация...' : 'T2V'}
                      </Button>
                      <Button
                        onClick={handleGenerateVideoFromImage}
                        disabled={isGenerating || !mediaUrl || mediaType !== 'image'}
                        variant="secondary"
                        size="sm"
                        leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      >
                        {isGenerating ? 'Генерация...' : 'I2V'}
                      </Button>
                      <Button
                        onClick={() => videoUploadRef.current?.click()}
                        disabled={isUploading}
                        variant="secondary"
                        size="sm"
                        leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      >
                        Загрузить
                      </Button>
                      <input
                        ref={videoUploadRef}
                        type="file"
                        accept="video/*"
                        onChange={handleUploadVideo}
                        className="hidden"
                      />
                    </div>
                    {mediaUrl && mediaType === 'video' && (
                      <div className="relative rounded-lg overflow-hidden border border-dark-600/50">
                        <video src={mediaUrl} controls className="w-full h-auto" />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Генерация аудио */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Аудио</h4>
                <div className="space-y-3">
                  <Button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio || !scene.text}
                    variant="primary"
                    size="sm"
                    leftIcon={isGeneratingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  >
                    {isGeneratingAudio ? 'Генерация...' : 'Сгенерировать речь'}
                  </Button>
                  {scene.audioUrl && (
                    <div className="flex items-center gap-2 p-2 bg-dark-700/50 rounded-lg border border-dark-600/50">
                      <audio ref={audioRef} src={scene.audioUrl} controls className="flex-1" />
                    </div>
                  )}
                </div>
              </div>

              {/* Настройки текста */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Настройки текста</h4>
                <div className="space-y-3">
                  {/* Позиция текста */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Позиция</label>
                    <div className="flex gap-2">
                      {(['top', 'center', 'bottom', 'none'] as const).map((pos) => {
                        const Icon = pos === 'top' ? AlignVerticalJustifyStart :
                                     pos === 'center' ? AlignVerticalJustifyCenter :
                                     pos === 'bottom' ? AlignVerticalJustifyEnd : AlignCenter
                        return (
                          <button
                            key={pos}
                            onClick={() => updateScene(scene.id, { textPosition: pos })}
                            className={`flex-1 p-2 rounded-lg border transition-all ${
                              (scene.textPosition || 'bottom') === pos
                                ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                                : 'border-dark-600 bg-dark-700/50 text-gray-400 hover:border-primary-500/50'
                            }`}
                            title={pos === 'top' ? 'Сверху' : pos === 'center' ? 'По центру' : pos === 'bottom' ? 'Снизу' : 'Скрыть'}
                          >
                            <Icon className="w-4 h-4 mx-auto" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Размер шрифта */}
                  <Slider
                    label="Размер шрифта"
                    value={scene.fontSize || 45}
                    min={20}
                    max={80}
                    step={1}
                    onChange={(value) => updateScene(scene.id, { fontSize: value })}
                  />

                  {/* Выравнивание */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Выравнивание</label>
                    <div className="flex gap-2">
                      {(['left', 'center', 'right'] as const).map((align) => {
                        const Icon = align === 'left' ? AlignLeft :
                                     align === 'center' ? AlignCenter : AlignRight
                        return (
                          <button
                            key={align}
                            onClick={() => updateScene(scene.id, { textAlign: align })}
                            className={`flex-1 p-2 rounded-lg border transition-all ${
                              (scene.textAlign || 'center') === align
                                ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                                : 'border-dark-600 bg-dark-700/50 text-gray-400 hover:border-primary-500/50'
                            }`}
                          >
                            <Icon className="w-4 h-4 mx-auto" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Цвет текста */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Цвет текста</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={scene.textColor || '#ffffff'}
                        onChange={(e) => updateScene(scene.id, { textColor: e.target.value })}
                        className="w-12 h-10 rounded-lg border border-dark-600 cursor-pointer"
                      />
                      <Input
                        value={scene.textColor || '#ffffff'}
                        onChange={(e) => updateScene(scene.id, { textColor: e.target.value })}
                        className="flex-1"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  {/* Анимация текста */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Анимация текста</label>
                    <Select
                      value={scene.textAnimation || 'word-by-word'}
                      onValueChange={(value) => updateScene(scene.id, { textAnimation: value as Scene['textAnimation'] })}
                    >
                      <SelectItem value="none">Нет</SelectItem>
                      <SelectItem value="fade">Появление</SelectItem>
                      <SelectItem value="slide-up">Снизу вверх</SelectItem>
                      <SelectItem value="scale">Масштаб</SelectItem>
                      <SelectItem value="typewriter">Печатная машинка</SelectItem>
                      <SelectItem value="word-by-word">По словам</SelectItem>
                    </Select>
                  </div>

                  {/* Анимация медиа */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Анимация медиа</label>
                    <Select
                      value={scene.mediaAnimation || 'zoom-in'}
                      onValueChange={(value) => updateScene(scene.id, { mediaAnimation: value as Scene['mediaAnimation'] })}
                    >
                      <SelectItem value="none">Нет</SelectItem>
                      <SelectItem value="zoom-in">Приближение</SelectItem>
                      <SelectItem value="zoom-out">Отдаление</SelectItem>
                      <SelectItem value="pan-left">Панорама влево</SelectItem>
                      <SelectItem value="pan-right">Панорама вправо</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Длительность */}
              <div>
                <Input
                  type="number"
                  label="Длительность (сек)"
                  value={durationInSeconds.toFixed(1)}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  step="0.1"
                  min="0.5"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
