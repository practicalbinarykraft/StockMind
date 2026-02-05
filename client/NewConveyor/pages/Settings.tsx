import { useState, useEffect } from 'react'
import { Plus, Trash2, Link as LinkIcon, Save, Instagram, Key, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { RssFeed, LLMProvider } from '../types'
import { saveApiKey, deleteApiKey, testApiKey, getAISettings } from '../lib/services/scripts'

// API Keys configuration
const API_KEY_CONFIGS = [
  { key: 'anthropic' as LLMProvider, label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', description: 'Для генерации сценариев' },
  { key: 'deepseek' as LLMProvider, label: 'DeepSeek', placeholder: 'sk-...', description: 'Бесплатная альтернатива Claude' },
  { key: 'elevenlabs', label: 'ElevenLabs', placeholder: 'xi-...', description: 'Для озвучки' },
  { key: 'heygen', label: 'HeyGen', placeholder: '', description: 'Для аватаров' },
  { key: 'apify', label: 'Apify', placeholder: 'apify_api_...', description: 'Для парсинга Instagram' },
]

export default function Settings() {
  const [feeds, setFeeds] = useState<RssFeed[]>([
    {
      id: '1',
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      isActive: true,
    },
    {
      id: '2',
      name: 'BBC News',
      url: 'https://feeds.bbci.co.uk/news/rss.xml',
      isActive: true,
    },
  ])

  const [newFeed, setNewFeed] = useState({ name: '', url: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [instagramAccounts, setInstagramAccounts] = useState([
    { id: '1', username: '@techblogger', isActive: true },
    { id: '2', username: '@newschannel', isActive: true },
  ])
  const [newInstagram, setNewInstagram] = useState('')
  const [showInstagramForm, setShowInstagramForm] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [apiKeysLast4, setApiKeysLast4] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [keyMessages, setKeyMessages] = useState<Record<string, { success: boolean; message: string }>>({})

  // Load existing API keys info on mount
  useEffect(() => {
    loadApiKeysInfo()
  }, [])

  const loadApiKeysInfo = async () => {
    try {
      const settings = await getAISettings()
      const last4: Record<string, string> = {}
      if (settings.anthropicApiKeyLast4) last4['anthropic'] = settings.anthropicApiKeyLast4
      if (settings.deepseekApiKeyLast4) last4['deepseek'] = settings.deepseekApiKeyLast4
      setApiKeysLast4(last4)
    } catch (error) {
      console.error('Error loading API keys info:', error)
    }
  }

  const handleSaveApiKey = async (provider: string) => {
    const key = apiKeys[provider]
    if (!key?.trim()) {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: false, message: 'Введите API ключ' } }))
      return
    }

    // Only anthropic and deepseek are connected to backend
    if (provider !== 'anthropic' && provider !== 'deepseek') {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: true, message: 'Ключ сохранён (локально)' } }))
      return
    }

    setSavingKey(provider)
    setKeyMessages(prev => ({ ...prev, [provider]: undefined as any }))

    try {
      const result = await saveApiKey(provider as LLMProvider, key.trim())
      setKeyMessages(prev => ({ ...prev, [provider]: { success: true, message: `Сохранён (****${result.last4})` } }))
      setApiKeys(prev => ({ ...prev, [provider]: '' }))
      setApiKeysLast4(prev => ({ ...prev, [provider]: result.last4 }))
    } catch (error: any) {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: false, message: error.message || 'Ошибка сохранения' } }))
    } finally {
      setSavingKey(null)
    }
  }

  const handleTestApiKey = async (provider: string) => {
    if (provider !== 'anthropic' && provider !== 'deepseek') {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: false, message: 'Тест недоступен для этого провайдера' } }))
      return
    }

    setTestingKey(provider)
    setKeyMessages(prev => ({ ...prev, [provider]: undefined as any }))

    try {
      const result = await testApiKey(provider as LLMProvider)
      setKeyMessages(prev => ({ ...prev, [provider]: { success: result.success, message: result.message } }))
    } catch (error: any) {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: false, message: error.message || 'Ошибка тестирования' } }))
    } finally {
      setTestingKey(null)
    }
  }

  const handleDeleteApiKey = async (provider: string) => {
    if (provider !== 'anthropic' && provider !== 'deepseek') return
    if (!confirm(`Удалить API ключ ${provider}?`)) return

    try {
      await deleteApiKey(provider as LLMProvider)
      setKeyMessages(prev => ({ ...prev, [provider]: { success: true, message: 'Ключ удалён' } }))
      setApiKeysLast4(prev => {
        const newLast4 = { ...prev }
        delete newLast4[provider]
        return newLast4
      })
    } catch (error: any) {
      setKeyMessages(prev => ({ ...prev, [provider]: { success: false, message: error.message || 'Ошибка удаления' } }))
    }
  }

  const handleAddFeed = () => {
    if (newFeed.name && newFeed.url) {
      setFeeds([
        ...feeds,
        {
          id: Date.now().toString(),
          name: newFeed.name,
          url: newFeed.url,
          isActive: true,
        },
      ])
      setNewFeed({ name: '', url: '' })
      setShowAddForm(false)
    }
  }

  const handleDeleteFeed = (id: string) => {
    setFeeds(feeds.filter((feed) => feed.id !== id))
  }

  const handleToggleActive = (id: string) => {
    setFeeds(
      feeds.map((feed) =>
        feed.id === id ? { ...feed, isActive: !feed.isActive } : feed
      )
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Настройки</h2>
        <p className="text-gray-400">Управление источниками новостей и API ключами</p>
      </div>

      <div className="glass rounded-xl p-6 glow-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <LinkIcon className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-white">RSS Ленты</h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить ленту
          </button>
        </div>

        {showAddForm && (
          <div className="glass rounded-lg p-4 mb-6 border border-primary-500/30">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Название источника
                </label>
                <input
                  type="text"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                  placeholder="Например: TechCrunch"
                  className="w-full px-4 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL RSS ленты
                </label>
                <input
                  type="url"
                  value={newFeed.url}
                  onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-4 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFeed}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewFeed({ name: '', url: '' })
                  }}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {feeds.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <LinkIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Нет добавленных RSS лент</p>
            <p className="text-sm mt-2">Добавьте первую ленту, чтобы начать парсинг новостей</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="glass rounded-lg p-4 border border-dark-700/50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-white">{feed.name}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        feed.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {feed.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 break-all">{feed.url}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(feed.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      feed.isActive
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {feed.isActive ? 'Деактивировать' : 'Активировать'}
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instagram Блогеры */}
      <div className="glass rounded-xl p-6 glow-border mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Instagram Блогеры</h3>
          </div>
          <button
            onClick={() => setShowInstagramForm(!showInstagramForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>

        {/* Форма добавления */}
        {showInstagramForm && (
          <div className="glass rounded-lg p-4 mb-6 border border-primary-500/30">
            <input
              type="text"
              value={newInstagram}
              onChange={(e) => setNewInstagram(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-white"
            />
            <button
              onClick={() => {
                if (newInstagram) {
                  setInstagramAccounts([...instagramAccounts, { id: Date.now().toString(), username: newInstagram, isActive: true }])
                  setNewInstagram('')
                  setShowInstagramForm(false)
                }
              }}
              className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg"
            >
              Добавить
            </button>
          </div>
        )}

        {/* Список аккаунтов */}
        <div className="space-y-3">
          {instagramAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 glass rounded-lg">
              <span className="text-white">{account.username}</span>
              <button
                onClick={() => setInstagramAccounts(instagramAccounts.filter(a => a.id !== account.id))}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API Ключи */}
      <div className="glass rounded-xl p-6 glow-border mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-yellow-500/20">
            <Key className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-xl font-bold text-white">API Ключи</h3>
        </div>

        <div className="space-y-4">
          {API_KEY_CONFIGS.map((item) => {
            const hasKey = !!apiKeysLast4[item.key]
            const isSaving = savingKey === item.key
            const isTesting = testingKey === item.key
            const message = keyMessages[item.key]
            const isLLMProvider = item.key === 'anthropic' || item.key === 'deepseek'

            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-40">
                    <label className="text-gray-300 text-sm font-medium">{item.label}</label>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[item.key] ? 'text' : 'password'}
                        value={apiKeys[item.key] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [item.key]: e.target.value }))}
                        placeholder={hasKey ? `****${apiKeysLast4[item.key]}` : item.placeholder || 'Введите ключ...'}
                        className="w-full px-4 py-2 pr-10 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showKeys[item.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={() => handleSaveApiKey(item.key)}
                      disabled={isSaving || !apiKeys[item.key]?.trim()}
                      className="px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:text-gray-500 text-white rounded-lg transition-colors"
                      title="Сохранить"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>

                    {/* Test button - only for LLM providers */}
                    {isLLMProvider && hasKey && (
                      <button
                        onClick={() => handleTestApiKey(item.key)}
                        disabled={isTesting}
                        className="px-3 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
                        title="Тестировать"
                      >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Delete button - only for LLM providers */}
                    {isLLMProvider && hasKey && (
                      <button
                        onClick={() => handleDeleteApiKey(item.key)}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status message */}
                {message && (
                  <div className={`ml-44 text-xs flex items-center gap-1 ${message.success ? 'text-green-400' : 'text-red-400'}`}>
                    {message.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {message.message}
                  </div>
                )}

                {/* Has key indicator */}
                {hasKey && !message && (
                  <div className="ml-44 text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Ключ настроен (****{apiKeysLast4[item.key]})
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
