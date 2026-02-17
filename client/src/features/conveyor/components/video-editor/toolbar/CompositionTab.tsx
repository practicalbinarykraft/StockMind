/**
 * Вкладка для настройки композиции сцены
 * Поддерживает переключение между overlay и split режимами
 */

import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Slider } from '@/shared/ui/slider'
import { Switch } from '@/shared/ui/switch'
import { Separator } from '@/shared/ui/separator'
import type { CompositionMode } from '../../../types/layers'

export function CompositionTab() {
  const currentScene = useCompositionStore(selectCurrentScene)
  const setCompositionMode = useCompositionStore((state) => state.setCompositionMode)
  const updateSplitSettings = useCompositionStore((state) => state.updateSplitSettings)

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки композиции
      </div>
    )
  }

  const { composition } = currentScene

  // Проверка наличия composition
  if (!composition) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Композиция не инициализирована для этой сцены
      </div>
    )
  }

  const handleModeChange = (mode: CompositionMode) => {
    setCompositionMode(currentScene.id, mode)
  }

  const handleSplitRatioChange = (value: number[]) => {
    updateSplitSettings(currentScene.id, { splitRatio: value[0] / 100 })
  }

  const handleSplitDirectionChange = (direction: 'horizontal' | 'vertical') => {
    updateSplitSettings(currentScene.id, { splitDirection: direction })
  }

  const handleSplitOrderChange = (order: 'background-first' | 'overlay-first') => {
    updateSplitSettings(currentScene.id, { splitOrder: order })
  }

  const handleGridSnappingChange = (checked: boolean) => {
    updateSplitSettings(currentScene.id, { gridSnapping: checked })
  }

  const handleGridSizeChange = (value: number[]) => {
    updateSplitSettings(currentScene.id, { gridSize: value[0] })
  }

  return (
    <div className="space-y-6">
      {/* Режим композиции */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Режим композиции</h3>
          <p className="text-sm text-muted-foreground">
            Выберите способ размещения слоев
          </p>
        </div>

        <RadioGroup value={composition.mode} onValueChange={handleModeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="overlay" id="mode-overlay" />
            <Label htmlFor="mode-overlay" className="cursor-pointer">
              <div className="font-medium">Overlay</div>
              <div className="text-sm text-muted-foreground">
                Слои накладываются друг на друга
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="split" id="mode-split" />
            <Label htmlFor="mode-split" className="cursor-pointer">
              <div className="font-medium">Split</div>
              <div className="text-sm text-muted-foreground">
                Экран разделен на части для каждого слоя
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Настройки Split режима */}
      {composition.mode === 'split' && (
        <>
          <Separator />

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Настройки Split</h3>
            </div>

            {/* Пропорции разделения */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Пропорция разделения</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(composition.splitRatio * 100)}%
                </span>
              </div>
              <Slider
                value={[composition.splitRatio * 100]}
                min={10}
                max={90}
                step={5}
                onValueChange={handleSplitRatioChange}
              />
              <p className="text-xs text-muted-foreground">
                Определяет размер первого слоя относительно второго
              </p>
            </div>

            {/* Направление разделения */}
            <div className="space-y-3">
              <Label>Направление</Label>
              <RadioGroup
                value={composition.splitDirection}
                onValueChange={handleSplitDirectionChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="horizontal" id="dir-horizontal" />
                  <Label htmlFor="dir-horizontal" className="cursor-pointer">
                    Горизонтально (слева направо)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vertical" id="dir-vertical" />
                  <Label htmlFor="dir-vertical" className="cursor-pointer">
                    Вертикально (сверху вниз)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Порядок слоев */}
            <div className="space-y-3">
              <Label>Порядок слоев</Label>
              <RadioGroup
                value={composition.splitOrder}
                onValueChange={handleSplitOrderChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="background-first" id="order-bg" />
                  <Label htmlFor="order-bg" className="cursor-pointer">
                    Background первым
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overlay-first" id="order-ol" />
                  <Label htmlFor="order-ol" className="cursor-pointer">
                    Overlay первым
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Grid Snapping */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Привязка к сетке</h3>
          <p className="text-sm text-muted-foreground">
            Для точного позиционирования overlay элементов
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="grid-snapping">Включить привязку</Label>
          <Switch
            id="grid-snapping"
            checked={composition.gridSnapping}
            onCheckedChange={handleGridSnappingChange}
          />
        </div>

        {composition.gridSnapping && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Размер сетки</Label>
              <span className="text-sm text-muted-foreground">{composition.gridSize}px</span>
            </div>
            <Slider
              value={[composition.gridSize]}
              min={5}
              max={50}
              step={5}
              onValueChange={handleGridSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
