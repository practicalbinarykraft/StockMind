import { Router, Request, Response } from 'express';
import { db } from '../db';
import { aiSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getAvailableProviders, LLMProvider, testProvider } from '../lib/llm-provider';
import { encryptApiKey, decryptApiKey, getLast4 } from '../lib/encryption';

const router = Router();

// GET /api/settings/providers - получить доступных провайдеров
router.get('/providers', (req: Request, res: Response) => {
  try {
    const availableProviders = getAvailableProviders();

    const providers = [
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Claude Sonnet 4 - высокое качество',
        available: availableProviders.includes('anthropic'),
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'DeepSeek Chat - бесплатный/дешёвый',
        available: availableProviders.includes('deepseek'),
      },
    ];

    res.json(providers);
  } catch (error) {
    console.error('[Settings] Ошибка при получении провайдеров:', error);
    res.status(500).json({
      error: 'Ошибка при получении провайдеров',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * Преобразовать настройки для отправки клиенту
 * Убирает зашифрованные ключи, оставляет только last4
 */
function toSafeSettings(settings: any) {
  const { anthropicApiKey, deepseekApiKey, ...safe } = settings;
  return {
    ...safe,
    // Добавляем информацию о настроенных ключах
    hasAnthropicKey: !!anthropicApiKey,
    hasDeepseekKey: !!deepseekApiKey,
  };
}

// GET /api/settings - получить настройки (или создать дефолтные)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Получить настройки из БД
    const [settings] = await db.select().from(aiSettings).limit(1);

    if (settings) {
      return res.json(toSafeSettings(settings));
    }

    // Создать дефолтные настройки если их нет
    const defaultSettings = {
      provider: 'anthropic' as LLMProvider,
      scriptwriterPrompt: '',
      editorPrompt: '',
      maxIterations: 3,
      minApprovalScore: 8,
      autoSendToHumanReview: true,
      examples: [],
    };

    const [newSettings] = await db
      .insert(aiSettings)
      .values(defaultSettings)
      .returning();

    res.json(toSafeSettings(newSettings));
  } catch (error: any) {
    // Если ошибка БД - возвращаем дефолтные настройки (для работы с мок данными)
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.message?.includes('connect')) {
      console.warn('[Settings] БД недоступна, возвращаем дефолтные настройки');
      const defaultSettings = {
        provider: 'anthropic' as LLMProvider,
        scriptwriterPrompt: '',
        editorPrompt: '',
        maxIterations: 3,
        minApprovalScore: 8,
        autoSendToHumanReview: true,
        examples: [],
        hasAnthropicKey: false,
        hasDeepseekKey: false,
      };
      return res.json(defaultSettings);
    }
    
    console.error('[Settings] Ошибка при получении настроек:', error);
    res.status(500).json({
      error: 'Ошибка при получении настроек',
      code: 'INTERNAL_ERROR',
    });
  }
});

// PATCH /api/settings - обновить настройки
router.patch('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Получить текущие настройки
    const [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      // Создать дефолтные настройки если их нет
      const defaultSettings = {
        provider: 'anthropic' as LLMProvider,
        scriptwriterPrompt: '',
        editorPrompt: '',
        maxIterations: 3,
        minApprovalScore: 8,
        autoSendToHumanReview: true,
        examples: [],
      };

      const [newSettings] = await db
        .insert(aiSettings)
        .values({ ...defaultSettings, ...updates })
        .returning();

      return res.json(newSettings);
    }

    // Обновить только переданные поля
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Разрешенные поля для обновления
    const allowedFields = [
      'provider',
      'scriptwriterPrompt',
      'editorPrompt',
      'maxIterations',
      'minApprovalScore',
      'autoSendToHumanReview',
      'examples',
    ];

    allowedFields.forEach((field) => {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    });

    // Валидация значений
    if (updateData.provider !== undefined) {
      const validProviders = ['anthropic', 'deepseek'];
      if (!validProviders.includes(updateData.provider)) {
        return res.status(400).json({
          error: `provider должен быть одним из: ${validProviders.join(', ')}`,
          code: 'VALIDATION_ERROR',
        });
      }
    }

    if (updateData.maxIterations !== undefined) {
      if (typeof updateData.maxIterations !== 'number' || updateData.maxIterations < 1 || updateData.maxIterations > 10) {
        return res.status(400).json({
          error: 'maxIterations должен быть числом от 1 до 10',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    if (updateData.minApprovalScore !== undefined) {
      if (typeof updateData.minApprovalScore !== 'number' || updateData.minApprovalScore < 1 || updateData.minApprovalScore > 10) {
        return res.status(400).json({
          error: 'minApprovalScore должен быть числом от 1 до 10',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    if (updateData.examples !== undefined) {
      if (!Array.isArray(updateData.examples)) {
        return res.status(400).json({
          error: 'examples должен быть массивом',
          code: 'VALIDATION_ERROR',
        });
      }
    }

    // Обновить настройки
    const [updatedSettings] = await db
      .update(aiSettings)
      .set(updateData)
      .where(eq(aiSettings.id, currentSettings.id))
      .returning();

    res.json(toSafeSettings(updatedSettings));
  } catch (error) {
    console.error('[Settings] Ошибка при обновлении настроек:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении настроек',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/settings/api-key - установить API ключ
router.post('/api-key', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    // Валидация
    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'Поля provider и apiKey обязательны',
        code: 'VALIDATION_ERROR',
      });
    }

    const validProviders = ['anthropic', 'deepseek'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `provider должен быть одним из: ${validProviders.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    // Получить текущие настройки
    let [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      // Создать дефолтные настройки
      const [newSettings] = await db
        .insert(aiSettings)
        .values({
          provider: 'anthropic' as LLMProvider,
          maxIterations: 3,
          minApprovalScore: 8,
          autoSendToHumanReview: true,
          examples: [],
        })
        .returning();
      currentSettings = newSettings;
    }

    // Зашифровать ключ и сохранить
    const trimmedKey = apiKey.trim();
    const encryptedKey = encryptApiKey(trimmedKey);
    const last4 = getLast4(trimmedKey);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (provider === 'anthropic') {
      updateData.anthropicApiKey = encryptedKey;
      updateData.anthropicApiKeyLast4 = last4;
    } else if (provider === 'deepseek') {
      updateData.deepseekApiKey = encryptedKey;
      updateData.deepseekApiKeyLast4 = last4;
    }

    const [updatedSettings] = await db
      .update(aiSettings)
      .set(updateData)
      .where(eq(aiSettings.id, currentSettings.id))
      .returning();

    console.log(`[Settings] API ключ ${provider} сохранён (****${last4})`);

    res.json({
      success: true,
      provider,
      last4,
    });
  } catch (error) {
    console.error('[Settings] Ошибка при сохранении API ключа:', error);
    res.status(500).json({
      error: 'Ошибка при сохранении API ключа',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE /api/settings/api-key/:provider - удалить API ключ
router.delete('/api-key/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    const validProviders = ['anthropic', 'deepseek'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `provider должен быть одним из: ${validProviders.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      return res.status(404).json({
        error: 'Настройки не найдены',
        code: 'NOT_FOUND',
      });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (provider === 'anthropic') {
      updateData.anthropicApiKey = null;
      updateData.anthropicApiKeyLast4 = null;
    } else if (provider === 'deepseek') {
      updateData.deepseekApiKey = null;
      updateData.deepseekApiKeyLast4 = null;
    }

    await db
      .update(aiSettings)
      .set(updateData)
      .where(eq(aiSettings.id, currentSettings.id));

    console.log(`[Settings] API ключ ${provider} удалён`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Settings] Ошибка при удалении API ключа:', error);
    res.status(500).json({
      error: 'Ошибка при удалении API ключа',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/settings/api-key/:provider/test - протестировать API ключ
router.post('/api-key/:provider/test', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    const validProviders = ['anthropic', 'deepseek'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `provider должен быть одним из: ${validProviders.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      return res.status(404).json({
        error: 'Настройки не найдены',
        code: 'NOT_FOUND',
      });
    }

    // Получить зашифрованный ключ
    let encryptedKey: string | null = null;
    if (provider === 'anthropic') {
      encryptedKey = currentSettings.anthropicApiKey;
    } else if (provider === 'deepseek') {
      encryptedKey = currentSettings.deepseekApiKey;
    }

    if (!encryptedKey) {
      return res.status(400).json({
        error: `API ключ ${provider} не настроен`,
        code: 'KEY_NOT_FOUND',
      });
    }

    // Расшифровать ключ
    const decryptedKey = decryptApiKey(encryptedKey);

    if (!decryptedKey) {
      return res.status(400).json({
        error: 'Не удалось расшифровать API ключ',
        code: 'DECRYPTION_ERROR',
      });
    }

    // Тестировать ключ
    const result = await testProvider(provider as LLMProvider, decryptedKey);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        code: 'TEST_FAILED',
      });
    }
  } catch (error) {
    console.error('[Settings] Ошибка при тестировании API ключа:', error);
    res.status(500).json({
      error: 'Ошибка при тестировании API ключа',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/settings/examples - добавить пример сценария
router.post('/examples', async (req: Request, res: Response) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({
        error: 'Поля filename и content обязательны',
        code: 'VALIDATION_ERROR',
      });
    }

    // Получить текущие настройки
    const [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      return res.status(404).json({
        error: 'Настройки не найдены. Сначала создайте настройки через GET /api/settings',
        code: 'NOT_FOUND',
      });
    }

    // Попробовать разбить content на сцены
    const scenes = parseScenesFromContent(content);

    // Создать новый пример
    const newExample = {
      id: randomUUID(),
      filename,
      content,
      scenes,
      createdAt: new Date().toISOString(),
    };

    // Добавить в массив examples
    const currentExamples = (currentSettings.examples as any[]) || [];
    const updatedExamples = [...currentExamples, newExample];

    // Обновить настройки
    const [updatedSettings] = await db
      .update(aiSettings)
      .set({
        examples: updatedExamples as any,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, currentSettings.id))
      .returning();

    res.status(201).json(newExample);
  } catch (error) {
    console.error('[Settings] Ошибка при добавлении примера:', error);
    res.status(500).json({
      error: 'Ошибка при добавлении примера',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE /api/settings/examples/:exampleId - удалить пример
router.delete('/examples/:exampleId', async (req: Request, res: Response) => {
  try {
    const { exampleId } = req.params;

    if (!exampleId) {
      return res.status(400).json({
        error: 'exampleId обязателен',
        code: 'VALIDATION_ERROR',
      });
    }

    // Получить текущие настройки
    const [currentSettings] = await db.select().from(aiSettings).limit(1);

    if (!currentSettings) {
      return res.status(404).json({
        error: 'Настройки не найдены',
        code: 'NOT_FOUND',
      });
    }

    // Найти пример по id в массиве
    const currentExamples = (currentSettings.examples as any[]) || [];
    const exampleIndex = currentExamples.findIndex((ex: any) => ex.id === exampleId);

    if (exampleIndex === -1) {
      return res.status(404).json({
        error: 'Пример не найден',
        code: 'NOT_FOUND',
      });
    }

    // Удалить из массива
    const updatedExamples = currentExamples.filter((ex: any) => ex.id !== exampleId);

    // Сохранить настройки
    await db
      .update(aiSettings)
      .set({
        examples: updatedExamples as any,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, currentSettings.id));

    res.json({ success: true });
  } catch (error) {
    console.error('[Settings] Ошибка при удалении примера:', error);
    res.status(500).json({
      error: 'Ошибка при удалении примера',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * Парсинг контента на сцены
 * Пытается найти сцены по номерам или абзацам
 */
function parseScenesFromContent(content: string): any[] {
  const scenes: any[] = [];

  // Попытка найти сцены по паттерну "Сцена 1:", "Сцена 1", "1.", и т.д.
  const scenePatterns = [
    /Сцена\s+(\d+)[:\.]?\s*(.*?)(?=Сцена\s+\d+|$)/gis,
    /(\d+)\.\s*(.*?)(?=\d+\.|$)/gis,
    /Scene\s+(\d+)[:\.]?\s*(.*?)(?=Scene\s+\d+|$)/gis,
  ];

  for (const pattern of scenePatterns) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach((match) => {
        const number = parseInt(match[1], 10);
        const text = match[2]?.trim() || '';
        if (text) {
          scenes.push({
            number,
            text,
          });
        }
      });
      break; // Используем первый успешный паттерн
    }
  }

  // Если не нашли по паттернам, разбиваем по абзацам
  if (scenes.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    paragraphs.forEach((paragraph, index) => {
      scenes.push({
        number: index + 1,
        text: paragraph.trim(),
      });
    });
  }

  return scenes;
}

export default router;
