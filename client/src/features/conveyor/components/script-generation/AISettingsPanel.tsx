import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Save, RotateCcw, Cpu, Key, CheckCircle, XCircle, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import type { AISettings, LLMProvider } from '../../types'
import { useAISettingsActions } from '../../hooks/use-scripts'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'

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
  const [localSettings, setLocalSettings] = useState<AISettings>(settings)
  const { saveApiKey, deleteApiKey, testApiKey } = useAISettingsActions()

  // API Key states
  const [anthropicKey, setAnthropicKey] = useState('')
  const [deepseekKey, setDeepseekKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showDeepseekKey, setShowDeepseekKey] = useState(false)

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

  const renderApiKeySection = (provider: LLMProvider) => {
    const isAnthropic = provider === 'anthropic'
    const hasKey = isAnthropic ? localSettings.hasAnthropicKey : localSettings.hasDeepseekKey
    const last4 = isAnthropic ? localSettings.anthropicApiKeyLast4 : localSettings.deepseekApiKeyLast4
    const inputValue = isAnthropic ? anthropicKey : deepseekKey
    const setInputValue = isAnthropic ? setAnthropicKey : setDeepseekKey
    const showKey = isAnthropic ? showAnthropicKey : showDeepseekKey
    const setShowKey = isAnthropic ? setShowAnthropicKey : setShowDeepseekKey

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            {isAnthropic ? 'Anthropic API Key' : 'DeepSeek API Key'}
          </Label>
          {hasKey && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              ****{last4}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={hasKey ? 'Введите новый ключ для замены...' : 'sk-...'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            onClick={() => saveApiKey.mutate({ provider, apiKey: inputValue.trim() })}
            disabled={saveApiKey.isPending || !inputValue.trim()}
            size="icon"
          >
            {saveApiKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>

          {hasKey && (
            <>
              <Button
                onClick={() => testApiKey.mutate(provider)}
                disabled={testApiKey.isPending}
                variant="outline"
                size="icon"
                title="Тестировать ключ"
              >
                {testApiKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => {
                  if (confirm(`Удалить API ключ ${provider}?`)) {
                    deleteApiKey.mutate(provider)
                  }
                }}
                variant="destructive"
                size="icon"
                title="Удалить ключ"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-xl font-bold">Настройки AI</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-6">
          {/* API Keys Section */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">API Ключи</span>
            </div>
            <div className="space-y-4">
              {renderApiKeySection('anthropic')}
              {renderApiKeySection('deepseek')}
            </div>
          </Card>

          {/* Provider Selection */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-primary" />
              <span className="font-medium">AI Провайдер для конвейера</span>
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
                        ? 'border-primary bg-primary/10'
                        : hasKey
                          ? 'border-border hover:border-primary/50'
                          : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-medium ${
                        localSettings.provider === option.value ? 'text-primary' : hasKey ? '' : 'text-muted-foreground'
                      }`}>
                        {option.label}
                      </div>
                      {hasKey ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                    {!hasKey && (
                      <div className="text-xs text-yellow-500 mt-1">Добавьте API ключ</div>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scriptwriter AI */}
            <div className="space-y-4">
              <Label>Сценарист AI</Label>
              <Textarea
                value={localSettings.scriptwriterPrompt}
                onChange={(e) => setLocalSettings({ ...localSettings, scriptwriterPrompt: e.target.value })}
                placeholder="Дополнительные инструкции для AI-сценариста..."
                rows={8}
              />
              <p className="text-sm text-muted-foreground">
                Примеров: {localSettings.examples.length}
              </p>
            </div>

            {/* Editor AI */}
            <div className="space-y-4">
              <Label>Редактор AI</Label>
              <Textarea
                value={localSettings.editorPrompt}
                onChange={(e) => setLocalSettings({ ...localSettings, editorPrompt: e.target.value })}
                placeholder="Дополнительные инструкции для AI-редактора..."
                rows={8}
              />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="w-32">Макс. итераций:</Label>
                  <Input
                    type="number"
                    value={localSettings.maxIterations}
                    onChange={(e) => setLocalSettings({ ...localSettings, maxIterations: parseInt(e.target.value) || 3 })}
                    min="1"
                    max="10"
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={localSettings.autoSendToHumanReview}
                    onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoSendToHumanReview: checked as boolean })}
                  />
                  <Label className="cursor-pointer">
                    Автоматическая отправка на рецензию человеку после завершения
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить настройки
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Сбросить к дефолтным
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
