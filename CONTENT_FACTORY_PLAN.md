# 🏭 CONTENT FACTORY: Полный План Разработки

**Версия 1.0 | Финальный план**

---

## 📋 СОДЕРЖАНИЕ

1. [Концепция](#концепция)
2. [Архитектура конвейера](#архитектура-конвейера)
3. [Детальное описание агентов](#детальное-описание-агентов)
4. [Схема базы данных](#схема-базы-данных)
5. [API Endpoints](#api-endpoints)
6. [UI Компоненты](#ui-компоненты)
7. [План разработки по фазам](#план-разработки-по-фазам)
8. [Структура файлов](#структура-файлов)
9. [Стоимость и лимиты](#стоимость-и-лимиты)
10. [Checklist готовности](#checklist-готовности)

---

## 1. КОНЦЕПЦИЯ

### Принцип Генри Форда

**FORD'S ASSEMBLY LINE (1913):**

```
┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
│Шасси│ → │Мотор│ → │Кузов│ → │Двери│ → │Краска│ → │  QC │ → 🚗
└─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘
   ↓         ↓         ↓         ↓         ↓         ↓
  ОДИН    ОДИН      ОДИН      ОДИН      ОДИН      ОДИН
 РАБОЧИЙ  РАБОЧИЙ   РАБОЧИЙ   РАБОЧИЙ   РАБОЧИЙ   РАБОЧИЙ
```

**Ключевые принципы:**
- Каждый агент делает ОДНУ операцию
- Контент движется по конвейеру
- Каждый этап добавляет ценность
- Брак отсеивается на каждом этапе
- Система учится на фидбеке пользователя

---

## 2. АРХИТЕКТУРА КОНВЕЙЕРА

```
                              CONTENT FACTORY ASSEMBLY LINE
══════════════════════════════════════════════════════════════════════════
═════

RAW MATERIAL (Статьи/Рилсы)
        │
        ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   🔍 SCOUT   │ ──▶ │  📊 SCORER   │ ──▶ │  🎯 ANALYST  │ ──▶ │ 📐 ARCHITECT │
│   Agent #1   │     │   Agent #2   │     │   Agent #3   │     │   Agent #4   │
├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────────┤
│ Находит      │     │ Оценивает    │     │ Анализирует  │     │ Выбирает     │
│ контент      │     │ потенциал    │     │ тему/аудит.  │     │ формат       │
│              │     │ 0-100        │     │              │     │              │
│ ⏱ ~1 сек     │     │ ⏱ ~3 сек     │     │ ⏱ ~5 сек     │     │ ⏱ ~3 сек     │
│ 🤖 Нет AI    │     │ 🤖 Sonnet    │     │ 🤖 Sonnet    │     │ 🤖 Sonnet    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
        │                   │                   │                     │
        │ item_id           │ + score           │ + topics            │ + format
        │ source_type       │ + breakdown       │ + audience          │ + structure
        │ raw_content       │ + verdict         │ + angles            │ + hooks[]
        ▼                   ▼                   ▼                     ▼
══════════════════════════════════════════════════════════════════════════
══════
                                    │
                                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   ✍️ WRITER  │ ──▶ │  🔬 QC       │ ──▶ │ ⚡ OPTIMIZER │ ──▶ │  ✅ GATE     │
│   Agent #5   │     │   Agent #6   │     │   Agent #7   │     │   Agent #8   │
├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────────┤
│ Пишет        │     │ Проверяет    │     │ Улучшает     │     │ Финальная    │
│ сценарий     │     │ качество     │     │ слабые места │     │ проверка     │
│              │     │              │     │              │     │              │
│ ⏱ ~15 сек    │     │ ⏱ ~10 сек    │     │ ⏱ ~10 сек    │     │ ⏱ ~1 сек     │
│ 🤖 Sonnet    │     │ 🤖 Sonnet x4 │     │ 🤖 Sonnet    │     │ 🤖 Нет AI    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
        │                   │                   │                     │
        │ + scenes[]        │ + qc_report       │ + improvements      │ PASS/FAIL
        │ + full_script     │ + weak_spots      │ + final_script      │
        │ + timings         │ + suggestions     │ + final_score       │
        ▼                   ▼                   ▼                     ▼
══════════════════════════════════════════════════════════════════════════
══════
                                    │
                          ┌─────────┴─────────┐
                          │                   │
                       PASS ✅             FAIL ❌
                          │                   │
                          ▼                   ▼
                 ┌──────────────┐     ┌──────────────┐
                 │ 📬 DELIVERY  │     │ 🗑️ REJECT    │
                 │   Agent #9   │     │   Handler    │
                 ├──────────────┤     ├──────────────┤
                 │ Сохраняет    │     │ Записывает   │
                 │ в очередь    │     │ причину      │
                 │ на ревью     │     │ в Learning   │
                 │ 🤖 Нет AI    │     │              │
                 └──────────────┘     └──────────────┘
                          │                   │
                          ▼                   ▼
                 ┌──────────────┐     ┌──────────────┐
                 │ 👤 USER      │     │ 🧠 LEARNING  │
                 │   REVIEW     │     │   SYSTEM     │
                 ├──────────────┤     ├──────────────┤
                 │ ✅ Approve   │────▶│ Обновляет    │
                 │ 🔄 Revise    │────▶│ пороги       │
                 │ ❌ Reject    │────▶│ и паттерны   │
                 └──────────────┘     └──────────────┘
                          │
                          ▼
                      🎬 ГОТОВЫЙ
                       СЦЕНАРИЙ

══════════════════════════════════════════════════════════════════════════
═════
```

---

## 3. ДЕТАЛЬНОЕ ОПИСАНИЕ АГЕНТОВ

### Agent #1: 🔍 SCOUT (Разведчик)

```
╔══════════════════════════════════════════════════════════════════╗
║  SCOUT AGENT                                                     ║
║  "Находит сырьё для конвейера"                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • RSS feeds (периодический мониторинг)                          ║
║  • Instagram reels (по расписанию)                               ║
║  • User settings (фильтры, источники)                            ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Найти новый контент (не обработанный ранее)                  ║
║  2. Применить базовые фильтры пользователя                       ║
║  3. Извлечь полный текст (если нужно - scraping)                 ║
║  4. Нормализовать данные в единый формат                         ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    source: {                                                     ║
║      type: 'news' | 'instagram',                                 ║
║      itemId: 'uuid',                                             ║
║      title: 'Заголовок статьи',                                  ║
║      content: 'Полный текст...',                                 ║
║      url: 'https://...',                                         ║
║      publishedAt: Date                                           ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  КРИТЕРИИ ПЕРЕДАЧИ ДАЛЬШЕ:                                       ║
║  ✓ Контент не пустой (>100 символов)                             ║
║  ✓ Не дубликат (проверка по URL)                                 ║
║  ✓ Прошёл keyword фильтры                                        ║
║  ✓ Не старше max_age_days (default 7)                            ║
║  ✓ Не обработан ранее (нет в conveyor_items)                     ║
║                                                                  ║
║  🤖 НЕ ИСПОЛЬЗУЕТ AI (чистая логика)                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #2: 📊 SCORER (Оценщик)

```
╔══════════════════════════════════════════════════════════════════╗
║  SCORER AGENT                                                    ║
║  "Оценивает вирусный потенциал"                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • source.title                                                  ║
║  • source.content                                                ║
║  • user.learned_threshold (из Learning System)                   ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Оценить по 4 критериям (0-100 каждый)                        ║
║  2. Вычислить общий score                                        ║
║  3. Определить verdict                                           ║
║                                                                  ║
║  AI PROMPT:                                                      ║
║  Оцени вирусный потенциал контента для короткого видео.          ║
║                                                                  ║
║  КОНТЕНТ:                                                        ║
║  Заголовок: {title}                                              ║
║  Текст: {content}                                                ║
║                                                                  ║
║  Оцени по критериям:                                             ║
║  1. Конкретные факты/цифры (0-35) - есть ли wow-факты?           ║
║  2. Актуальность/тренды (0-25) - это горячая тема?               ║
║  3. Широта аудитории (0-20) - кому это интересно?                ║
║  4. Интерес темы (0-20) - захочется ли досмотреть?               ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    scoring: {                                                    ║
║      score: 78,                                                  ║
║      verdict: 'strong',  // viral(85+), strong(70+),             ║
║                          // moderate(50+), weak(<50)             ║
║      breakdown: { factScore, relevanceScore, ... },              ║
║      reasoning: '...'                                            ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  КРИТЕРИИ ПЕРЕДАЧИ ДАЛЬШЕ:                                       ║
║  ✓ score >= user.min_score_threshold (default 70)                ║
║  ✓ score >= user.learned_threshold (адаптивный)                  ║
║                                                                  ║
║  ЕСЛИ НЕ ПРОШЁЛ → status='failed', reason='low_score'            ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #3: 🎯 ANALYST (Аналитик)

```
╔══════════════════════════════════════════════════════════════════╗
║  ANALYST AGENT                                                   ║
║  "Глубокий анализ темы и аудитории"                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • source.title                                                  ║
║  • source.content                                                ║
║  • scoring.breakdown                                             ║
║  • scoring.reasoning                                             ║
║  • user.avoided_topics (из Learning System)                      ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Определить главную тему и подтемы                            ║
║  2. Определить целевую аудиторию                                 ║
║  3. Найти эмоциональные углы подачи                              ║
║  4. Выделить ключевые факты для сценария                         ║
║  5. Оценить уровень controversy                                  ║
║  6. Найти уникальный угол (отличие от конкурентов)               ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    analysis: {                                                   ║
║      mainTopic: "AI заменяет программистов",                     ║
║      subTopics: ["автоматизация", "рынок труда", "будущее"],     ║
║      targetAudience: ["разработчики", "HR", "студенты IT"],      ║
║      emotionalAngles: ["страх", "любопытство", "надежда"],      ║
║      keyFacts: ["GPT-4 пишет код...", ...],                     ║
║      controversyLevel: 7,                                        ║
║      uniqueAngle: "Взгляд изнутри от senior dev"                 ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  КРИТЕРИИ ПЕРЕДАЧИ ДАЛЬШЕ:                                       ║
║  ✓ mainTopic не в user.avoided_topics                            ║
║  ✓ Есть минимум 3 keyFacts                                       ║
║  ✓ uniqueAngle не пустой                                         ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #4: 📐 ARCHITECT (Архитектор)

```
╔══════════════════════════════════════════════════════════════════╗
║  ARCHITECT AGENT                                                 ║
║  "Проектирует структуру сценария"                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • analysis.mainTopic                                            ║
║  • analysis.targetAudience                                       ║
║  • analysis.emotionalAngles                                      ║
║  • analysis.controversyLevel                                     ║
║  • analysis.keyFacts                                             ║
║  • scoring.score                                                 ║
║  • user.preferred_formats (из Learning System)                   ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Выбрать оптимальный формат видео                             ║
║  2. Предложить варианты хуков (3 штуки)                          ║
║  3. Определить структуру по времени                              ║
║                                                                  ║
║  ДОСТУПНЫЕ ФОРМАТЫ:                                              ║
║  • hook_story   - Захват + история (высокая controversy)        ║
║  • explainer    - Объяснение (сложные темы)                       ║
║  • news_update  - Новость дня (свежие события)                   ║
║  • listicle     - Топ-5 (много фактов)                            ║
║  • hot_take     - Провокация (controversy > 7)                   ║
║  • myth_buster  - Разрушение мифов                               ║
║  • tutorial     - Обучение (практические темы)                   ║
║  • comparison   - Сравнение (A vs B)                             ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    architecture: {                                               ║
║      formatId: 'hot_take',                                       ║
║      formatName: 'Hot Take',                                     ║
║      reasoning: 'Высокий controversy + актуальная тема',         ║
║      suggestedHooks: [                                           ║
║        "ChatGPT только что уволил 1000 программистов...",       ║
║        "Ваша профессия исчезнет через 2 года, если...",          ║
║        "Я senior dev, и я в панике. Вот почему..."              ║
║      ],                                                          ║
║      structureTemplate: { hook, context, main, twist, cta },     ║
║      totalDuration: 65                                           ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #5: ✍️ WRITER (Сценарист)

```
╔══════════════════════════════════════════════════════════════════╗
║  WRITER AGENT                                                    ║
║  "Пишет сценарий по сценам"                                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • source.content (исходный материал)                             ║
║  • analysis.keyFacts (что включить)                              ║
║  • analysis.uniqueAngle (как подать)                             ║
║  • analysis.emotionalAngles (какие эмоции)                       ║
║  • architecture.formatId (структура)                             ║
║  • architecture.suggestedHooks[0] (лучший хук)                   ║
║  • architecture.structureTemplate (тайминги)                     ║
║  • user.rejection_patterns (чего избегать!)                      ║
║  • revision_context (если это revision)                          ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Написать сценарий по сценам                                  ║
║  2. Соблюсти тайминги из structureTemplate                       ║
║  3. Включить все keyFacts                                        ║
║  4. Использовать выбранный хук                                   ║
║  5. Избежать паттернов отказа пользователя                        ║
║  6. Если revision - учесть замечания                             ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    script: {                                                     ║
║      scenes: [                                                   ║
║        { id: 1, label: 'hook', text: '...', start: 0, end: 5 }, ║
║        { id: 2, label: 'context', text: '...', start: 5, end: 15 }║
║        ...                                                       ║
║      ],                                                          ║
║      fullScript: "Полный текст...",                              ║
║      estimatedDuration: 65                                       ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #6: 🔬 QC (Контроль Качества)

```
╔══════════════════════════════════════════════════════════════════╗
║  QC AGENT (Quality Control)                                      ║
║  "Проверяет качество сценария"                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • script.scenes                                                 ║
║  • script.fullScript                                             ║
║  • architecture.formatId                                         ║
║  • architecture.structureTemplate                                ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Оценить Hook (захватывает ли?)                              ║
║  2. Оценить Structure (логичная ли?)                             ║
║  3. Оценить Emotional Impact (цепляет ли?)                        ║
║  4. Оценить CTA (есть ли призыв?)                                ║
║  5. Найти слабые места                                           ║
║  6. Предложить улучшения                                         ║
║                                                                  ║
║  ВЫПОЛНЯЕТ 4 ПАРАЛЛЕЛЬНЫХ AI ЗАПРОСА:                            ║
║                                                                  ║
║  • HOOK CHECK - Оцени первые 5 секунд                           ║
║  • STRUCTURE CHECK - Оцени структуру                             ║
║  • EMOTIONAL CHECK - Оцени эмоциональное воздействие              ║
║  • CTA CHECK - Оцени призыв к действию                           ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    qualityControl: {                                             ║
║      overallScore: 72,  // среднее из 4х                         ║
║      hookScore: 85,                                              ║
║      structureScore: 70,                                          ║
║      emotionalScore: 65,                                          ║
║      ctaScore: 68,                                               ║
║      weakSpots: [...],                                            ║
║      passedQC: false  // true если: score>=75 И нет critical     ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  КРИТЕРИИ ПРОХОЖДЕНИЯ QC:                                        ║
║  ✓ overallScore >= 75                                            ║
║  ✓ Нет weak spots с severity = 'critical'                        ║
║  ✓ hookScore >= 70                                               ║
║                                                                  ║
║  ЕСЛИ НЕ ПРОШЁЛ → передать в Optimizer                           ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet x4 (параллельно)                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #7: ⚡ OPTIMIZER (Оптимизатор)

```
╔══════════════════════════════════════════════════════════════════╗
║  OPTIMIZER AGENT                                                 ║
║  "Улучшает сценарий по результатам QC"                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ВХОД:                                                           ║
║  • script.scenes                                                 ║
║  • script.fullScript                                             ║
║  • qualityControl.weakSpots                                      ║
║  • qualityControl.overallScore                                   ║
║  • iteration_count (текущая итерация)                            ║
║                                                                  ║
║  ОТВЕТСТВЕННОСТЬ:                                                ║
║  1. Применить все suggestions из QC                              ║
║  2. Улучшить слабые сцены                                        ║
║  3. Сохранить сильные части без изменений                        ║
║                                                                  ║
║  ЦИКЛ QC → OPTIMIZER:                                            ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │                                                            │  ║
║  │  QC проверяет → score < 75? → Optimizer улучшает → QC     │  ║
║  │       ↑                                              │     │  ║
║  │       └──────────────────────────────────────────────┘     │  ║
║  │                                                            │  ║
║  │  ЛИМИТ: максимум 2 итерации                                │  ║
║  │  После 2х итераций:                                        │  ║
║  │  - Если score >= 70 → NEEDS_REVIEW (пусть user решит)      │  ║
║  │  - Если score < 70 → FAIL                                  │  ║
║  │                                                            │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  🤖 ИСПОЛЬЗУЕТ: Claude Sonnet                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #8: ✅ GATE (Финальные Ворота)

```
╔══════════════════════════════════════════════════════════════════╗
║  GATE AGENT                                                      ║
║  "Принимает финальное решение"                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ЛОГИКА ПРИНЯТИЯ РЕШЕНИЯ (без AI):                               ║
║                                                                  ║
║  IF overallScore >= 85 AND no_critical AND hookScore >= 80:     ║
║      → PASS (высокая уверенность)                                ║
║                                                                  ║
║  ELSE IF overallScore >= 75 AND no_critical AND approvalRate > 0.7:║
║      → PASS (пользователь обычно одобряет такие)                 ║
║                                                                  ║
║  ELSE IF overallScore >= 70 AND no_critical:                     ║
║      → NEEDS_REVIEW (пусть пользователь решит)                   ║
║                                                                  ║
║  ELSE:                                                           ║
║      → FAIL (не соответствует стандартам)                        ║
║                                                                  ║
║  ВЫХОД:                                                          ║
║  {                                                               ║
║    gate: {                                                       ║
║      decision: 'PASS' | 'FAIL' | 'NEEDS_REVIEW',                 ║
║      reason: 'Объяснение решения',                               ║
║      confidence: 0.85,                                           ║
║      finalScore: 82                                              ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  🤖 НЕ ИСПОЛЬЗУЕТ AI (чистая логика)                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Agent #9: 📬 DELIVERY (Доставка)

```
╔══════════════════════════════════════════════════════════════════╗
║  DELIVERY AGENT                                                  ║
║  "Сохраняет результат"                                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ЛОГИКА (без AI):                                                ║
║                                                                  ║
║  IF decision == 'PASS' OR 'NEEDS_REVIEW':                        ║
║      → Сохранить в auto_scripts (status = 'pending')             ║
║      → Обновить статистику                                       ║
║                                                                  ║
║  IF decision == 'FAIL':                                          ║
║      → Записать в лог причину                                    ║
║      → Отправить в Learning System                               ║
║      → Обновить статистику (total_failed++)                      ║
║                                                                  ║
║  🤖 НЕ ИСПОЛЬЗУЕТ AI (чистая логика)                             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🧠 LEARNING SYSTEM (Система Обучения)

### ON APPROVE:
- Обновить статистику (total_approved++, approval_rate)
- Запомнить формат как успешный
- Если score был пограничный (70-75) - можно понизить порог

### ON REJECT (user):
- Обновить статистику (total_rejected++)
- Записать rejection pattern
- Если категория = "boring_topic" → добавить в avoided_topics
- Если rejection_rate > 50% → повысить threshold на 5

### ON REVISE:
- Анализировать что пользователь хочет изменить
- Записать паттерны в rejection_patterns

### ON GATE FAIL:
- Анализировать почему не прошёл
- Если много fails от одного источника → понизить приоритет

### REJECTION CATEGORIES:
- `too_long` - "Сценарий должен быть до 60 секунд"
- `too_short` - "Сценарий должен быть минимум 45 секунд"
- `boring_intro` - "Начинай с провокации, вопроса или шока"
- `weak_cta` - "Добавь сильный призыв к действию в конце"
- `too_formal` - "Пиши разговорным языком, как друг"
- `too_casual` - "Добавь экспертности и фактов"
- `boring_topic` - → Добавляется в avoided_topics
- `wrong_tone` - "Используй тон: {user_preferred_tone}"
- `no_hook` - "Первые 5 сек должны захватить внимание"
- `too_complex` - "Упрости, объясняй как для 12-летнего"
- `off_topic` - "Строго придерживайся темы статьи"

---

## 🔄 REVISION FLOW (Поток доработки)

```
User нажимает "Revise"
        │
        ▼
┌─────────────────────────────────────┐
│ 1. Обновить auto_scripts:           │
│    - status = 'revision'            │
│    - revision_notes = user_notes    │
│    - revision_count++               │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 2. Проверить лимит:                 │
│    revision_count > 3?              │
│    ДА → auto reject, notify user    │
│    НЕТ → продолжить                 │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 3. Создать НОВЫЙ conveyor_item:     │
│    - Скопировать source, scoring,   │
│      analysis, architecture         │
│    - Добавить revision_context:     │
│      { notes, previous_script, attempt }│
│    - parent_item_id = old_item_id   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. Запустить с этапа 5 (Writer):    │
│    - Writer видит revision_context  │
│    - Использует специальный промпт  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 5. Обычный flow:                    │
│    Writer → QC → Optimizer → Gate   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 6. Результат:                       │
│    - Обновить тот же auto_script    │
│    - status = 'pending'             │
│    - Новые scenes, scores           │
└─────────────────────────────────────┘
```

**ЛИМИТЫ:**
- Максимум 3 revision на один сценарий
- После 3х → автоматический reject с причиной "Превышен лимит доработок"

---

## ⚠️ ERROR HANDLING (Обработка ошибок)

### ТИПЫ ОШИБОК И СТРАТЕГИИ:

1. **AI RATE LIMIT (429)**
   - Стратегия: Exponential backoff
   - Попытка 1: ждать 60 сек
   - Попытка 2: ждать 120 сек
   - Попытка 3: ждать 240 сек
   - После 3х попыток: status = 'failed'

2. **AI TIMEOUT**
   - Стратегия: Retry с тем же запросом
   - Попытка 1: ждать 30 сек
   - Попытка 2: ждать 30 сек
   - После 2х попыток: status = 'failed'

3. **INVALID AI RESPONSE (не парсится JSON)**
   - Стратегия: Retry с уточнённым промптом
   - Попытка 1: добавить "Ответь ТОЛЬКО валидным JSON"
   - Попытка 2: упростить промпт
   - После 2х попыток: status = 'failed'

4. **BUSINESS LOGIC ERROR**
   - (нет keyFacts, пустой script, score=0)
   - Стратегия: НЕ retry, сразу fail
   - status = 'failed', error_stage = номер агента

5. **DATABASE ERROR**
   - Стратегия: Retry + alerting
   - 3 попытки с интервалом 5 сек
   - После 3х: status = 'failed', log critical error

**RETRY ЧЕРЕЗ API:**
- POST /api/conveyor/items/:id/retry
- Позволяет вручную перезапустить failed item
- Начинает с error_stage (не сначала)

---

## 4. СХЕМА БАЗЫ ДАННЫХ

```sql
-- 1. Настройки конвейера пользователя
CREATE TABLE conveyor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Включение/выключение
  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Scout settings
  source_types TEXT[] NOT NULL DEFAULT ARRAY['news'],
  source_ids UUID[],
  keywords TEXT[],
  exclude_keywords TEXT[],
  max_age_days INTEGER NOT NULL DEFAULT 7,

  -- Scorer settings
  min_score_threshold INTEGER NOT NULL DEFAULT 70,

  -- Rate limits
  daily_limit INTEGER NOT NULL DEFAULT 10,
  items_processed_today INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Learning data
  learned_threshold INTEGER,
  rejection_patterns JSONB NOT NULL DEFAULT '{}',
  avoided_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_formats TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Stats
  total_processed INTEGER NOT NULL DEFAULT 0,
  total_passed INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  total_approved INTEGER NOT NULL DEFAULT 0,
  total_rejected INTEGER NOT NULL DEFAULT 0,
  approval_rate DECIMAL(5,4),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Элементы на конвейере (история обработки)
CREATE TABLE conveyor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Source reference
  source_type TEXT NOT NULL,
  source_item_id UUID NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'processing',
  current_stage INTEGER NOT NULL DEFAULT 1,

  -- Data from each agent
  source_data JSONB,
  scoring_data JSONB,
  analysis_data JSONB,
  architecture_data JSONB,
  script_data JSONB,
  qc_data JSONB,
  optimization_data JSONB,
  gate_data JSONB,

  -- Stage history
  stage_history JSONB NOT NULL DEFAULT '[]',

  -- Revision context (if this is a revision)
  revision_context JSONB,
  parent_item_id UUID REFERENCES conveyor_items(id),

  -- Timing
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_processing_ms INTEGER,

  -- Error tracking
  error_stage INTEGER,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0
);

-- 3. Готовые сценарии на ревью
CREATE TABLE auto_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conveyor_item_id UUID NOT NULL REFERENCES conveyor_items(id),

  -- Source reference
  source_type TEXT NOT NULL,
  source_item_id UUID NOT NULL,

  -- Script content
  title TEXT NOT NULL,
  scenes JSONB NOT NULL,
  full_script TEXT NOT NULL,
  format_id TEXT NOT NULL,
  format_name TEXT NOT NULL,
  estimated_duration INTEGER,

  -- Scores
  initial_score INTEGER,
  final_score INTEGER NOT NULL,
  hook_score INTEGER,
  structure_score INTEGER,
  emotional_score INTEGER,
  cta_score INTEGER,

  -- Gate decision
  gate_decision TEXT NOT NULL,
  gate_confidence DECIMAL(3,2),

  -- User review
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  rejection_category TEXT,
  revision_notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,

  -- If approved
  project_id UUID REFERENCES projects(id),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- 4. Логи конвейера
CREATE TABLE conveyor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  conveyor_item_id UUID REFERENCES conveyor_items(id),

  -- Event info
  event_type TEXT NOT NULL,
  stage_number INTEGER,
  agent_name TEXT,

  -- Details
  details JSONB,

  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conveyor_items_user_status ON conveyor_items(user_id, status);
CREATE INDEX idx_conveyor_items_source ON conveyor_items(source_type, source_item_id);
CREATE INDEX idx_auto_scripts_pending ON auto_scripts(user_id) WHERE status = 'pending';
CREATE INDEX idx_conveyor_logs_item ON conveyor_logs(conveyor_item_id);
```

---

## 5. API ENDPOINTS

### Settings API
- `GET /api/conveyor/settings` - Получить настройки
- `PUT /api/conveyor/settings` - Обновить настройки
- `GET /api/conveyor/stats` - Статистика

### Auto Scripts API
- `GET /api/auto-scripts` - Список на ревью
- `GET /api/auto-scripts/:id` - Детали
- `POST /api/auto-scripts/:id/approve` - Одобрить → создать проект
- `POST /api/auto-scripts/:id/reject` - Отклонить + причина
- `POST /api/auto-scripts/:id/revise` - На доработку + заметки

### Conveyor Status API
- `GET /api/conveyor/status` - Текущий статус конвейера
- `GET /api/conveyor/items` - История обработки
- `GET /api/conveyor/items/:id` - Детали элемента

### Manual Trigger API
- `POST /api/conveyor/trigger` - Запустить обработку сейчас
- `POST /api/conveyor/process-item` - Обработать конкретную статью
- `POST /api/conveyor/items/:id/retry` - Повторить failed item

---

## 6. UI КОМПОНЕНТЫ

### Settings Page
- Toggle enabled
- Threshold slider
- Daily limit input (1-50)
- Source selection
- Keywords input

### Auto Scripts Review Page
- Список pending scripts
- Preview сценария
- Кнопки: Approve / Reject / Revise
- Rejection reason selector
- Revision notes input

### Conveyor Dashboard
- Статус конвейера (running/stopped)
- Статистика (processed/passed/failed)
- График approval rate
- Последние обработанные items

---

## 7. ПЛАН РАЗРАБОТКИ ПО ФАЗАМ

### PHASE 1: Фундамент (День 1-4)
- Схема БД
- Базовые типы и интерфейсы
- Storage layer

### PHASE 2: Агенты (День 5-10)
- Base Agent класс
- Scout, Scorer, Analyst, Architect, Writer, QC, Optimizer, Gate, Delivery

### PHASE 3: Конвейер (День 11-13)
- Conveyor Orchestrator
- Conveyor Runner (Cron)
- Интеграция в server/index.ts

### PHASE 4: Learning (День 14-15)
- Learning Service
- Интеграция в агентов

### PHASE 5: API (День 16-18)
- Settings API
- Auto Scripts API
- Status API
- Manual Trigger API

### PHASE 6: UI (День 19-22)
- Settings Page
- Review Page
- Dashboard

### PHASE 7: Тестирование (День 23-25)
- Unit тесты
- Integration тесты
- Manual testing

**ИТОГО: ~25 дней разработки**

---

## 8. СТРУКТУРА ФАЙЛОВ

```
server/
├── conveyor/
│   ├── types.ts
│   ├── conveyor-orchestrator.ts
│   ├── learning-service.ts
│   └── agents/
│       ├── base-agent.ts
│       ├── scout-agent.ts
│       ├── scorer-agent.ts
│       ├── analyst-agent.ts
│       ├── architect-agent.ts
│       ├── writer-agent.ts
│       ├── qc-agent.ts
│       ├── optimizer-agent.ts
│       ├── gate-agent.ts
│       └── delivery-agent.ts
├── storage/
│   └── conveyor.storage.ts
├── routes/
│   ├── conveyor-settings.routes.ts
│   ├── auto-scripts.routes.ts
│   ├── conveyor-status.routes.ts
│   └── conveyor-trigger.routes.ts
└── cron/
    └── conveyor-runner.ts

shared/schema/
└── conveyor.ts

client/src/pages/
├── settings/
│   └── conveyor-settings.tsx
├── auto-scripts/
│   ├── index.tsx
│   └── [id].tsx
└── conveyor/
    └── dashboard.tsx
```

---

## 9. СТОИМОСТЬ И ЛИМИТЫ

### AI CALLS PER ITEM:

| Agent          | AI Calls | Model      | ~Tokens | ~Cost        |
|----------------|----------|------------|---------|--------------|
| Scout          | 0        | -          | 0       | $0           |
| Scorer         | 1        | Sonnet     | 1K      | $0.006       |
| Analyst        | 1        | Sonnet     | 2K      | $0.012       |
| Architect      | 1        | Sonnet     | 1.5K    | $0.009       |
| Writer         | 1        | Sonnet     | 3K      | $0.018       |
| QC             | 4 parallel| Sonnet    | 4K      | $0.024       |
| Optimizer      | 1-2      | Sonnet     | 2K      | $0.012       |
| Gate           | 0        | -          | 0       | $0           |
| Delivery       | 0        | -          | 0       | $0           |
| **ИТОГО**      | **9-10** | **Sonnet** | **~14K**| **~$0.08**   |

**При 10 items/день = ~$0.80/день = ~$24/месяц на пользователя**

### DEFAULTS:

| Параметр              | Значение    | Тип          |
|-----------------------|-------------|--------------|
| min_score_threshold   | 70          | адаптивный    |
| daily_limit           | 10          | настраиваемый |
| max_revision_count    | 3           | фиксированный |
| max_content_age_days  | 7           | настраиваемый |
| ai_model              | Sonnet      | фиксированный |

---

## 10. CHECKLIST ГОТОВНОСТИ

### INFRASTRUCTURE:
- [ ] БД схема создана и применена
- [ ] Базовые типы определены
- [ ] Storage layer готов

### AGENTS:
- [ ] Scout Agent работает
- [ ] Scorer Agent работает
- [ ] Analyst Agent работает
- [ ] Architect Agent работает
- [ ] Writer Agent работает
- [ ] QC Agent работает
- [ ] Optimizer Agent работает
- [ ] Gate Agent работает
- [ ] Delivery Agent работает

### CONVEYOR:
- [ ] Orchestrator связывает агентов
- [ ] Cron runner запускает обработку
- [ ] Error handling работает
- [ ] Logging настроен

### LEARNING:
- [ ] Approve обновляет данные
- [ ] Reject записывает паттерны
- [ ] Threshold адаптируется
- [ ] Patterns попадают в промпты

### API:
- [ ] Settings API работает
- [ ] Auto Scripts API работает
- [ ] Status API работает
- [ ] Manual Trigger API работает
- [ ] Retry API работает

### UI:
- [ ] Settings page готова
- [ ] Review page готова
- [ ] Dashboard готов

### ERROR HANDLING:
- [ ] Rate limit retries работают
- [ ] Timeout retries работают
- [ ] Failed items можно retry через API

### REVISION FLOW:
- [ ] Revise создаёт новый conveyor_item
- [ ] Writer получает revision_notes
- [ ] Лимит 3 revision работает

---

**Версия: 1.0 | Дата: 2025-01-28**

