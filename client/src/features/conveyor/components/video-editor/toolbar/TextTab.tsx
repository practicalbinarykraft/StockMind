/**
 * Вкладка для настройки текстового слоя
 * Поддерживает статичный текст и бегущую строку (marquee)
 */

import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Slider } from '@/shared/ui/slider'
import { Switch } from '@/shared/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Separator } from '@/shared/ui/separator'
import type { TextPosition } from '../../../types/layers'

export function TextTab() {
  const currentScene = useCompositionStore(selectCurrentScene)
  const updateTextLayer = useCompositionStore((state) => state.updateTextLayer)

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки текста
      </div>
    )
  }

  const textLayer = currentScene.layers?.textLayer

  // Проверка наличия текстового слоя
  if (!textLayer) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Текстовый слой не инициализирован для этой сцены
      </div>
    )
  }

  const handleToggleVisible = (checked: boolean) => {
    updateTextLayer(currentScene.id, { isVisible: checked })
  }

  const handleTextChange = (text: string) => {
    updateTextLayer(currentScene.id, { text })
  }

  const handleModeChange = (mode: 'static' | 'marquee') => {
    updateTextLayer(currentScene.id, { mode })
  }

  const handlePositionTypeChange = (type: TextPosition['type']) => {
    updateTextLayer(currentScene.id, { position: { type } })
  }

  const handleFontSizeChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { fontSize: value[0] })
  }

  const handleFontFamilyChange = (fontFamily: string) => {
    updateTextLayer(currentScene.id, { fontFamily })
  }

  const handleTextColorChange = (textColor: string) => {
    updateTextLayer(currentScene.id, { textColor })
  }

  const handleTextAlignChange = (textAlign: 'left' | 'center' | 'right') => {
    updateTextLayer(currentScene.id, { textAlign })
  }

  const handleBackgroundColorChange = (backgroundColor: string) => {
    updateTextLayer(currentScene.id, { backgroundColor })
  }

  const handleBackgroundOpacityChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { backgroundOpacity: value[0] / 100 })
  }

  const handleMarqueeSpeedChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { marqueeSpeed: value[0] })
  }

  return (
    <div className="space-y-6">
      {/* Включить/выключить текстовый слой */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Текстовый слой</h3>
          <p className="text-sm text-muted-foreground">
            Добавить текст поверх видео
          </p>
        </div>
        <Switch
          checked={textLayer?.isVisible || false}
          onCheckedChange={handleToggleVisible}
        />
      </div>

      {textLayer?.isVisible && (
        <>
          <Separator />

          {/* Текст */}
          <div className="space-y-3">
            <Label htmlFor="text-content">Текст</Label>
            <Textarea
              id="text-content"
              placeholder="Введите текст..."
              value={textLayer.text || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={3}
            />
          </div>

          {/* Режим */}
          <div className="space-y-3">
            <Label>Режим отображения</Label>
            <RadioGroup value={textLayer.mode} onValueChange={handleModeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="static" id="mode-static" />
                <Label htmlFor="mode-static" className="cursor-pointer">
                  Статичный
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="marquee" id="mode-marquee" />
                <Label htmlFor="mode-marquee" className="cursor-pointer">
                  Бегущая строка
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Позиция */}
          <div className="space-y-3">
            <Label>Позиция</Label>
            <RadioGroup
              value={textLayer.position.type}
              onValueChange={handlePositionTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top" id="pos-top" />
                <Label htmlFor="pos-top" className="cursor-pointer">
                  Сверху
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="center" id="pos-center" />
                <Label htmlFor="pos-center" className="cursor-pointer">
                  По центру
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom" id="pos-bottom" />
                <Label htmlFor="pos-bottom" className="cursor-pointer">
                  Снизу
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Стиль текста */}
          <div className="space-y-4">
            <h4 className="font-semibold">Стиль текста</h4>

            {/* Размер шрифта */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Размер шрифта</Label>
                <span className="text-sm text-muted-foreground">{textLayer.fontSize}px</span>
              </div>
              <Slider
                value={[textLayer.fontSize]}
                min={12}
                max={120}
                step={2}
                onValueChange={handleFontSizeChange}
              />
            </div>

            {/* Семейство шрифта */}
            <div className="space-y-3">
              <Label htmlFor="font-family">Шрифт</Label>
              <Select value={textLayer.fontFamily} onValueChange={handleFontFamilyChange}>
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Цвет текста */}
            <div className="space-y-3">
              <Label htmlFor="text-color">Цвет текста</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={textLayer.textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textLayer.textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Выравнивание */}
            <div className="space-y-3">
              <Label>Выравнивание</Label>
              <RadioGroup value={textLayer.textAlign} onValueChange={handleTextAlignChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="align-left" />
                  <Label htmlFor="align-left" className="cursor-pointer">
                    По левому краю
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="align-center" />
                  <Label htmlFor="align-center" className="cursor-pointer">
                    По центру
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="align-right" />
                  <Label htmlFor="align-right" className="cursor-pointer">
                    По правому краю
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator />

          {/* Фон текста */}
          <div className="space-y-4">
            <h4 className="font-semibold">Фон текста</h4>

            {/* Цвет фона */}
            <div className="space-y-3">
              <Label htmlFor="bg-color">Цвет фона (опционально)</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={textLayer.backgroundColor || '#000000'}
                  onChange={(e) => handleBackgroundColorChange(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textLayer.backgroundColor || ''}
                  onChange={(e) => handleBackgroundColorChange(e.target.value)}
                  placeholder="Не задан"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Прозрачность фона */}
            {textLayer.backgroundColor && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Прозрачность фона</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(textLayer.backgroundOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[textLayer.backgroundOpacity * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={handleBackgroundOpacityChange}
                />
              </div>
            )}
          </div>

          {/* Скорость бегущей строки */}
          {textLayer.mode === 'marquee' && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Скорость бегущей строки</Label>
                  <span className="text-sm text-muted-foreground">
                    {textLayer.marqueeSpeed}px/s
                  </span>
                </div>
                <Slider
                  value={[textLayer.marqueeSpeed]}
                  min={10}
                  max={200}
                  step={10}
                  onValueChange={handleMarqueeSpeedChange}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
