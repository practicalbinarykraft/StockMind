/**
 * Диалог для генерации контента через Kie.ai
 * Поддерживает генерацию изображений, видео и image-to-video
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Loader2, Sparkles } from 'lucide-react'
import { useCompositionStore } from '../../../stores/composition'
import type { KieModel } from '../../../types/layers'

interface KieAiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layerType: 'background' | 'overlay'
  sceneId: string
}

export function KieAiDialog({ open, onOpenChange, layerType, sceneId }: KieAiDialogProps) {
  const generateContent = useCompositionStore((state) => state.generateContent)
  
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<KieModel>('flux-pro')
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16')
  const [isGenerating, setIsGenerating] = useState(false)

  const imageModels: KieModel[] = ['flux-pro', 'nano-banana-pro', 'recraft-v3', 'flux-schnell']
  const videoModels: KieModel[] = ['kling-ai-video']

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      await generateContent(sceneId, layerType, prompt, model, generationType, aspectRatio)
      onOpenChange(false)
      setPrompt('')
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerationTypeChange = (type: 'image' | 'video') => {
    setGenerationType(type)
    // Переключаем на соответствующую модель
    if (type === 'video') {
      setModel('kling-ai-video')
    } else {
      setModel('flux-pro')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генерация контента через Kie.ai
          </DialogTitle>
          <DialogDescription>
            Создайте изображение или видео с помощью AI для слоя {layerType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Тип генерации */}
          <div className="space-y-3">
            <Label>Тип контента</Label>
            <RadioGroup value={generationType} onValueChange={handleGenerationTypeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="type-image" />
                <Label htmlFor="type-image" className="cursor-pointer">
                  Изображение
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="type-video" />
                <Label htmlFor="type-video" className="cursor-pointer">
                  Видео
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Промпт */}
          <div className="space-y-3">
            <Label htmlFor="prompt">Промпт</Label>
            <Textarea
              id="prompt"
              placeholder="Опишите что вы хотите сгенерировать..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Будьте как можно более конкретны в описании
            </p>
          </div>

          {/* Модель */}
          <div className="space-y-3">
            <Label htmlFor="model">Модель</Label>
            <Select value={model} onValueChange={(value) => setModel(value as KieModel)}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generationType === 'image' ? (
                  <>
                    <SelectItem value="flux-pro">Flux Pro (Высокое качество)</SelectItem>
                    <SelectItem value="nano-banana-pro">Nano Banana Pro (Быстро)</SelectItem>
                    <SelectItem value="recraft-v3">Recraft V3 (Стильно)</SelectItem>
                    <SelectItem value="flux-schnell">Flux Schnell (Очень быстро)</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="kling-ai-video">Kling AI Video</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio (только для изображений) */}
          {generationType === 'image' && (
            <div className="space-y-3">
              <Label htmlFor="aspect-ratio">Соотношение сторон</Label>
              <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as any)}>
                <SelectTrigger id="aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Горизонтально)</SelectItem>
                  <SelectItem value="9:16">9:16 (Вертикально)</SelectItem>
                  <SelectItem value="1:1">1:1 (Квадрат)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Отмена
          </Button>
          <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Генерировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
