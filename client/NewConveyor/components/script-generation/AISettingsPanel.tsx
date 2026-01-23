import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Upload, Save, RotateCcw, Cpu, Key, CheckCircle, XCircle, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { AISettings, UploadedExample, LLMProvider } from '../../types'
import { ExamplesUploadModal } from './ExamplesUploadModal'
import { saveApiKey, deleteApiKey, testApiKey } from '../../lib/services/scripts'
import Button from '../ui/Button'

const PROVIDER_OPTIONS: { value: LLMProvider; label: string; description: string }[] = [
  { value: 'anthropic', label: 'Anthropic Claude', description: 'Claude Sonnet 4 - высокое качество' },
  { value: 'deepseek', label: 'DeepSeek', description: 'DeepSeek Chat - бесплатный/дешёвый' },
]

interface AISettingsPanelProps {
  settings: AISettings
  onSettingsChange: (settings: AISettings) => void
  isOpen: boolean
  onToggle: () => void
}

export function AISettingsPanel({ settings, onSettingsChange, isOpen, onToggle }: AISettingsPanelProps) {
  const [showExamplesModal, setShowExamplesModal] = useState(false)
  const [localSettings, setLocalSettings] = useState<AISettings>(settings)

  // API Key states
  const [anthropicKey, setAnthropicKey] = useState('')
  const [deepseekKey, setDeepseekKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showDeepseekKey, setShowDeepseekKey] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [keyMessage, setKeyMessage] = useState<{ provider: string; success: boolean; message: string } | null>(null)

  // Update local settings when prop changes
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(localSettings)
  }

  const handleReset = () => {
    setLocalSettings({
      ...localSettings,
      provider: 'anthropic',
      scriptwriterPrompt: '',
      editorPrompt: '',
      maxIterations: 3,
      autoSendToHumanReview: false,
      examples: [],
    })
  }

  const handleExamplesUpdate = (examples: UploadedExample[]) => {
    setLocalSettings({ ...localSettings, examples })
  }

  // API Key handlers
  const handleSaveApiKey = async (provider: LLMProvider) => {
    const key = provider === 'anthropic' ? anthropicKey : deepseekKey
    if (!key.trim()) {
      setKeyMessage({ provider, success: false, message: 'Введите API ключ' })
      return
    }

    setSavingKey(provider)
    setKeyMessage(null)

    try {
      const result = await saveApiKey(provider, key.trim())
      setKeyMessage({ provider, success: true, message: `Ключ сохранён (****${result.last4})` })

      // Clear input and update settings
      if (provider === 'anthropic') {
        setAnthropicKey('')
        setLocalSettings(prev => ({ ...prev, hasAnthropicKey: true, anthropicApiKeyLast4: result.last4 }))
      } else {
        setDeepseekKey('')
        setLocalSettings(prev => ({ ...prev, hasDeepseekKey: true, deepseekApiKeyLast4: result.last4 }))
      }
    } catch (error: any) {
      setKeyMessage({ provider, success: false, message: error.message || 'Ошибка сохранения' })
    } finally {
      setSavingKey(null)
    }
  }

  const handleTestApiKey = async (provider: LLMProvider) => {
    setTestingKey(provider)
    setKeyMessage(null)

    try {
      const result = await testApiKey(provider)
      setKeyMessage({ provider, success: result.success, message: result.message })
    } catch (error: any) {
      setKeyMessage({ provider, success: false, message: error.message || 'Ошибка тестирования' })
    } finally {
      setTestingKey(null)
    }
  }

  const handleDeleteApiKey = async (provider: LLMProvider) => {
    if (!confirm(`Удалить API ключ ${provider}?`)) return

    try {
      await deleteApiKey(provider)
      setKeyMessage({ provider, success: true, message: 'Ключ удалён' })

      if (provider === 'anthropic') {
        setLocalSettings(prev => ({ ...prev, hasAnthropicKey: false, anthropicApiKeyLast4: null }))
      } else {
        setLocalSettings(prev => ({ ...prev, hasDeepseekKey: false, deepseekApiKeyLast4: null }))
      }
    } catch (error: any) {
      setKeyMessage({ provider, success: false, message: error.message || 'Ошибка удаления' })
    }
  }

  const renderApiKeySection = (provider: LLMProvider) => {
    const isAnthropic = provider === 'anthropic'
    const hasKey = isAnthropic ? localSettings.hasAnthropicKey : localSettings.hasDeepseekKey
    const last4 = isAnthropic ? localSettings.anthropicApiKeyLast4 : localSettings.deepseekApiKeyLast4
    const inputValue = isAnthropic ? anthropicKey : deepseekKey
    const setInputValue = isAnthropic ? setAnthropicKey : setDeepseekKey
    const showKey = isAnthropic ? showAnthropicKey : showDeepseekKey
    const setShowKey = isAnthropic ? setShowAnthropicKey : setShowDeepseekKey
    const isSaving = savingKey === provider
    const isTesting = testingKey === provider
    const message = keyMessage?.provider === provider ? keyMessage : null

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {isAnthropic ? 'Anthropic API Key' : 'DeepSeek API Key'}
          </span>
          {hasKey && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              ****{last4}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={hasKey ? 'Введите новый ключ для замены...' : 'sk-...'}
              className="w-full px-3 py-2 pr-10 bg-dark-700/50 border border-dark-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => handleSaveApiKey(provider)}
            disabled={isSaving || !inputValue.trim()}
            className="px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>

          {hasKey && (
            <>
              <button
                onClick={() => handleTestApiKey(provider)}
                disabled={isTesting}
                className="px-3 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                title="Тестировать ключ"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDeleteApiKey(provider)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                title="Удалить ключ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {message && (
          <div className={`text-xs flex items-center gap-1 ${message.success ? 'text-green-400' : 'text-red-400'}`}>
            {message.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {message.message}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="glass rounded-xl p-6 glow-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className="text-xl font-bold text-white">Настройки AI</h3>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="space-y-6">
            {/* API Keys Section */}
            <div className="p-4 bg-dark-700/30 rounded-lg border border-dark-600">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">API Ключи</span>
              </div>
              <div className="space-y-4">
                {renderApiKeySection('anthropic')}
                {renderApiKeySection('deepseek')}
              </div>
            </div>

            {/* Provider Selection */}
            <div className="p-4 bg-dark-700/30 rounded-lg border border-dark-600">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-primary-400" />
                <span className="text-white font-medium">AI Провайдер для конвейера</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDER_OPTIONS.map((option) => {
                  const hasKey = option.value === 'anthropic' ? localSettings.hasAnthropicKey : localSettings.hasDeepseekKey
                  return (
                    <button
                      key={option.value}
                      onClick={() => setLocalSettings({ ...localSettings, provider: option.value })}
                      disabled={!hasKey}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        localSettings.provider === option.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : hasKey
                            ? 'border-dark-600 bg-dark-700/50 hover:border-dark-500'
                            : 'border-dark-700 bg-dark-800/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`font-medium ${
                          localSettings.provider === option.value ? 'text-primary-400' : hasKey ? 'text-white' : 'text-gray-500'
                        }`}>
                          {option.label}
                        </div>
                        {hasKey ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      {!hasKey && (
                        <div className="text-xs text-yellow-500 mt-1">Добавьте API ключ</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scriptwriter AI */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <span className="text-purple-400 text-sm font-medium">Сценарист AI</span>
                  </div>
                </div>
                <textarea
                  value={localSettings.scriptwriterPrompt}
                  onChange={(e) => setLocalSettings({ ...localSettings, scriptwriterPrompt: e.target.value })}
                  placeholder="Дополнительные инструкции для AI-сценариста..."
                  className="w-full h-32 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowExamplesModal(true)}
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Загрузить примеры
                  </Button>
                  <span className="text-sm text-gray-400">
                    Примеров: {localSettings.examples.length}
                  </span>
                </div>
              </div>

              {/* Editor AI */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <span className="text-green-400 text-sm font-medium">Редактор AI</span>
                  </div>
                </div>
                <textarea
                  value={localSettings.editorPrompt}
                  onChange={(e) => setLocalSettings({ ...localSettings, editorPrompt: e.target.value })}
                  placeholder="Дополнительные инструкции для AI-редактора..."
                  className="w-full h-32 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-300 w-32">Макс. итераций:</label>
                    <input
                      type="number"
                      value={localSettings.maxIterations}
                      onChange={(e) => setLocalSettings({ ...localSettings, maxIterations: parseInt(e.target.value) || 3 })}
                      min="1"
                      max="10"
                      className="w-20 px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.autoSendToHumanReview}
                      onChange={(e) => setLocalSettings({ ...localSettings, autoSendToHumanReview: e.target.checked })}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-700/50 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-300">
                      Автоматическая отправка на рецензию человеку после завершения
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-dark-700/50">
              <Button
                onClick={handleSave}
                variant="primary"
                size="md"
                leftIcon={<Save className="w-4 h-4" />}
              >
                Сохранить настройки
              </Button>
              <Button
                onClick={handleReset}
                variant="secondary"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Сбросить к дефолтным
              </Button>
            </div>
          </div>
        )}
      </div>

      {showExamplesModal && (
        <ExamplesUploadModal
          examples={localSettings.examples}
          onClose={() => setShowExamplesModal(false)}
          onSave={handleExamplesUpdate}
        />
      )}
    </>
  )
}
