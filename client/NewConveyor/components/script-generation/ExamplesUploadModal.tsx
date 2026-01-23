import { useState } from 'react'
import { X, Scissors, Plus, Trash2 } from 'lucide-react'
import { UploadedExample } from '../../types'
import Button from '../ui/Button'

interface ExamplesUploadModalProps {
  examples: UploadedExample[]
  onClose: () => void
  onSave: (examples: UploadedExample[]) => void
}

export function ExamplesUploadModal({ examples, onClose, onSave }: ExamplesUploadModalProps) {
  const [localExamples, setLocalExamples] = useState<UploadedExample[]>(examples)
  const [currentText, setCurrentText] = useState('')
  const [currentScenes, setCurrentScenes] = useState<string[]>([])
  const [isSplit, setIsSplit] = useState(false)

  // Разбивка текста на сцены (по абзацам или по специальным маркерам)
  const handleSplitIntoScenes = () => {
    if (!currentText.trim()) return

    // Разбиваем по двойным переносам строк или по номерам сцен
    const scenes = currentText
      .split(/\n\s*\n|(?=\d+[\.\)]\s*[Сс]цена|\d+[\.\)]\s*[Сс]цен)/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    setCurrentScenes(scenes)
    setIsSplit(true)
  }

  const handleAddExample = () => {
    if (!currentText.trim()) return

    const newExample: UploadedExample = {
      id: Date.now().toString() + Math.random(),
      filename: `Пример ${localExamples.length + 1}`,
      content: currentText,
      scenes: currentScenes.length > 0 ? currentScenes : undefined,
      uploadedAt: new Date(),
    }

    setLocalExamples([...localExamples, newExample])
    setCurrentText('')
    setCurrentScenes([])
    setIsSplit(false)
  }

  const handleSave = () => {
    // Если есть несохраненный текст, добавляем его
    if (currentText.trim() && !isSplit) {
      handleSplitIntoScenes()
    }
    if (currentText.trim() && currentScenes.length > 0) {
      handleAddExample()
    }
    
    onSave(localExamples)
    onClose()
  }

  const handleDelete = (id: string) => {
    setLocalExamples(localExamples.filter(ex => ex.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass rounded-xl p-6 glow-border max-w-2xl w-full animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Примеры хороших сценариев</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Вставьте готовый сценарий:
            </label>
            <textarea
              value={currentText}
              onChange={(e) => {
                setCurrentText(e.target.value)
                setIsSplit(false)
              }}
              placeholder="Вставьте текст сценария здесь...&#10;&#10;Сцена 1:&#10;Текст первой сцены...&#10;&#10;Сцена 2:&#10;Текст второй сцены..."
              className="w-full h-48 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          {!isSplit && currentText.trim() && (
            <Button
              onClick={handleSplitIntoScenes}
              variant="primary"
              size="md"
              leftIcon={<Scissors className="w-4 h-4" />}
            >
              Разбить на сцены
            </Button>
          )}

          {/* Scenes Preview */}
          {isSplit && currentScenes.length > 0 && (
            <div className="glass rounded-lg p-4 border border-primary-500/30">
              <h4 className="text-md font-semibold text-white mb-3">
                Разбито на {currentScenes.length} сцен:
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentScenes.map((scene, index) => (
                  <div
                    key={index}
                    className="p-3 bg-dark-700/30 rounded-lg border border-dark-600/50"
                  >
                    <div className="text-xs text-primary-400 mb-1">Сцена {index + 1}</div>
                    <p className="text-sm text-gray-300 line-clamp-2">{scene}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Saved Examples */}
        {localExamples.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-white mb-3">Сохранённые примеры:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {localExamples.map((example) => (
                <div
                  key={example.id}
                  className="flex items-center justify-between glass rounded-lg p-3"
                >
                  <div className="flex-1">
                    <span className="text-gray-300 flex items-center gap-2">
                      <span>📄</span>
                      {example.filename}
                    </span>
                    {example.scenes && (
                      <div className="text-xs text-gray-500 mt-1">
                        {example.scenes.length} сцен
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(example.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Another Example Button */}
        {isSplit && currentScenes.length > 0 && (
          <div className="mt-4">
            <Button
              onClick={handleAddExample}
              variant="secondary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Добавить ещё пример
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end mt-6 pt-6 border-t border-dark-700/50">
          <Button onClick={onClose} variant="secondary" size="md">
            Отмена
          </Button>
          <Button onClick={handleSave} variant="primary" size="md">
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  )
}
