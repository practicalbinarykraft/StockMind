import type { InstagramProfile, Reel } from '../../types'

// Моковые данные для демонстрации
const mockProfiles: InstagramProfile[] = [
  {
    id: '1',
    username: 'storyart.pro',
    profilePicUrl: 'https://via.placeholder.com/150/4F46E5/FFFFFF?text=SA',
    reelsCount: 12,
    lastSynced: '2024-01-15T10:30:00Z',
    isFavorite: true,
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '2',
    username: 'tech_news',
    profilePicUrl: 'https://via.placeholder.com/150/10B981/FFFFFF?text=TN',
    reelsCount: 8,
    lastSynced: '2024-01-14T15:20:00Z',
    isFavorite: false,
    createdAt: '2024-01-08T12:00:00Z',
  },
]

const mockReels: Record<string, Reel[]> = {
  '1': [
    {
      id: 'r1',
      profileId: '1',
      shortCode: 'ABC123',
      caption: '1. DeepSeek Бесплатно, открытый код. Умеет вести диалог, писать статьи, код и даже решать сложную математику. 4 Плюс: доступ к интернету и поиск актуальной информации. — Нет генерации картинок и...',
      thumbnailUrl: 'https://via.placeholder.com/400x600/4F46E5/FFFFFF?text=Reel+1',
      instagramUrl: 'https://www.instagram.com/reel/ABC123/',
      views: 99,
      likes: 4,
      comments: 0,
      publishedDate: '2025-09-09T10:00:00Z',
      status: 'new',
    },
    {
      id: 'r2',
      profileId: '1',
      shortCode: 'DEF456',
      caption: '1. Kandinsky 3.1 (Сбер) Генерирует и редактирует изображения по тексту (есть inpainting/outpainting, микширование), анимацию по сценам. Многие языки, включая русский. 2. Шедеврум (Яндекс) Генерирует...',
      thumbnailUrl: 'https://via.placeholder.com/400x600/10B981/FFFFFF?text=Reel+2',
      instagramUrl: 'https://www.instagram.com/reel/DEF456/',
      views: 52,
      likes: 6,
      comments: 0,
      publishedDate: '2025-09-08T14:30:00Z',
      status: 'ready',
    },
    {
      id: 'r3',
      profileId: '1',
      shortCode: 'GHI789',
      caption: '1. Продающие тексты за минуты Нейросеть пишет заголовки, офферы и тексты для сайтов, рассылок и рекламы — быстро и под вашу аудиторию. 2. Креативы для рекламы Баннеры, изображения и видео создаются...',
      thumbnailUrl: 'https://via.placeholder.com/400x600/8B5CF6/FFFFFF?text=Reel+3',
      instagramUrl: 'https://www.instagram.com/reel/GHI789/',
      views: 102,
      likes: 4,
      comments: 0,
      publishedDate: '2025-09-07T09:15:00Z',
      status: 'transcribed',
      transcript: 'Транскрипция текста...',
    },
  ],
  '2': [
    {
      id: 'r4',
      profileId: '2',
      shortCode: 'JKL012',
      caption: 'Ты уже десятый раз смотришь видео про нейросети, но всё ещё не попробовал сам? Может, причина — в одной из этих трёх ошибок? Напиши в комментах, какая из них знакома...',
      thumbnailUrl: 'https://via.placeholder.com/400x600/F59E0B/FFFFFF?text=Reel+4',
      instagramUrl: 'https://www.instagram.com/reel/JKL012/',
      views: 33,
      likes: 5,
      comments: 0,
      publishedDate: '2025-02-06T11:00:00Z',
      status: 'new',
    },
  ],
}

/**
 * Получить список Instagram профилей
 */
export async function getInstagramProfiles(): Promise<InstagramProfile[]> {
  // Имитация задержки API
  await new Promise((resolve) => setTimeout(resolve, 500))
  return [...mockProfiles]
}

/**
 * Добавить Instagram профиль
 */
export async function addInstagramProfile(username: string): Promise<InstagramProfile> {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  const normalizedUsername = username.trim().replace('@', '')
  
  if (!normalizedUsername) {
    throw new Error('Username is required')
  }
  
  // Проверка на существующий профиль
  const existing = mockProfiles.find(p => p.username.toLowerCase() === normalizedUsername.toLowerCase())
  if (existing) {
    throw new Error('Profile already exists')
  }
  
  const newProfile: InstagramProfile = {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    reelsCount: 0,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  }
  
  mockProfiles.push(newProfile)
  mockReels[newProfile.id] = []
  
  return newProfile
}

/**
 * Получить Instagram профиль по ID
 */
export async function getInstagramProfile(id: string): Promise<InstagramProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockProfiles.find(p => p.id === id) || null
}

/**
 * Синхронизировать Reels для профиля
 */
export async function syncInstagramReels(profileId: string): Promise<{ count: number }> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  
  const profile = mockProfiles.find(p => p.id === profileId)
  if (!profile) {
    throw new Error('Profile not found')
  }
  
  // Имитация синхронизации - добавляем несколько новых Reels
  const existingReels = mockReels[profileId] || []
  const newReels: Reel[] = [
    {
      id: crypto.randomUUID(),
      profileId,
      shortCode: `NEW${Date.now()}`,
      caption: 'Новый Reel после синхронизации',
      thumbnailUrl: 'https://via.placeholder.com/400x600/EF4444/FFFFFF?text=New',
      instagramUrl: `https://www.instagram.com/reel/NEW${Date.now()}/`,
      views: Math.floor(Math.random() * 100),
      likes: Math.floor(Math.random() * 20),
      comments: Math.floor(Math.random() * 5),
      publishedDate: new Date().toISOString(),
      status: 'new',
    },
  ]
  
  mockReels[profileId] = [...existingReels, ...newReels]
  profile.reelsCount = mockReels[profileId].length
  profile.lastSynced = new Date().toISOString()
  
  return { count: newReels.length }
}

/**
 * Получить Reels для профиля
 */
export async function getReels(profileId: string): Promise<Reel[]> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockReels[profileId] || []
}

/**
 * Транскрибировать Reel
 */
export async function transcribeReel(reelId: string): Promise<{ transcript: string }> {
  await new Promise((resolve) => setTimeout(resolve, 3000))
  
  // Находим Reel во всех профилях
  for (const profileId in mockReels) {
    const reel = mockReels[profileId].find(r => r.id === reelId)
    if (reel) {
      reel.status = 'transcribed'
      reel.transcript = `Транскрипция для Reel ${reel.shortCode}: ${reel.caption || 'Без описания'}`
      return { transcript: reel.transcript }
    }
  }
  
  throw new Error('Reel not found')
}

/**
 * Анализировать Reel
 */
export async function analyzeReel(reelId: string): Promise<{ analysis: any }> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  
  // Находим Reel во всех профилях
  for (const profileId in mockReels) {
    const reel = mockReels[profileId].find(r => r.id === reelId)
    if (reel) {
      reel.status = 'analyzed'
      return {
        analysis: {
          viralScore: Math.floor(Math.random() * 100),
          engagementRate: (reel.likes || 0) / (reel.views || 1) * 100,
          recommendations: ['Рекомендация 1', 'Рекомендация 2'],
        },
      }
    }
  }
  
  throw new Error('Reel not found')
}

/**
 * Обновить профиль
 */
export async function updateInstagramProfile(
  id: string,
  updates: Partial<InstagramProfile>
): Promise<InstagramProfile> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  
  const profileIndex = mockProfiles.findIndex(p => p.id === id)
  if (profileIndex === -1) {
    throw new Error('Profile not found')
  }
  
  mockProfiles[profileIndex] = { ...mockProfiles[profileIndex], ...updates }
  return mockProfiles[profileIndex]
}

/**
 * Удалить профиль
 */
export async function deleteInstagramProfile(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  const profileIndex = mockProfiles.findIndex(p => p.id === id)
  if (profileIndex === -1) {
    throw new Error('Profile not found')
  }
  
  mockProfiles.splice(profileIndex, 1)
  delete mockReels[id]
}
