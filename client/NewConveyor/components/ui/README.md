# UI Компоненты

Библиотека переиспользуемых UI компонентов для Content Factory.

## Button

Универсальная кнопка с разными вариантами стилей.

```tsx
import { Button } from '../components/ui'

<Button variant="primary" size="md">
  Нажми меня
</Button>

<Button variant="secondary" leftIcon={<Icon />} isLoading>
  Загрузка...
</Button>
```

**Варианты:**
- `primary` - основная кнопка с градиентом
- `secondary` - вторичная кнопка
- `outline` - кнопка с обводкой
- `ghost` - прозрачная кнопка
- `danger` - кнопка для опасных действий

**Размеры:** `sm`, `md`, `lg`

---

## Card

Карточка с эффектом стекла.

```tsx
import { Card } from '../components/ui'

<Card variant="glass" hover padding="md">
  <h3>Заголовок</h3>
  <p>Содержимое карточки</p>
</Card>
```

**Варианты:**
- `default` - стандартная карточка
- `glass` - с эффектом стекла
- `glow` - с эффектом свечения

**Padding:** `none`, `sm`, `md`, `lg`

---

## Badge

Бейдж для статусов и меток.

```tsx
import { Badge } from '../components/ui'

<Badge variant="success" size="md">
  Активна
</Badge>
```

**Варианты:**
- `default` - стандартный
- `success` - успех (зеленый)
- `warning` - предупреждение (желтый)
- `error` - ошибка (красный)
- `info` - информация (синий)
- `neon` - неоновый эффект

---

## Input

Поле ввода с футуристичным дизайном.

```tsx
import { Input } from '../components/ui'
import { Search } from 'lucide-react'

<Input
  label="Поиск"
  placeholder="Введите запрос..."
  leftIcon={<Search />}
  error="Обязательное поле"
/>
```

**Пропсы:**
- `label` - метка поля
- `error` - сообщение об ошибке
- `helperText` - подсказка
- `leftIcon` - иконка слева
- `rightIcon` - иконка справа

---

## LoadingSpinner

Индикатор загрузки.

```tsx
import { LoadingSpinner } from '../components/ui'

<LoadingSpinner size="md" variant="neon" />
```

**Размеры:** `sm`, `md`, `lg`  
**Варианты:** `default`, `neon`

---

## ProgressBar

Прогресс-бар для отображения прогресса.

```tsx
import { ProgressBar } from '../components/ui'

<ProgressBar
  value={75}
  max={100}
  variant="neon"
  showLabel
  label="Загрузка"
/>
```

**Варианты:** `default`, `success`, `warning`, `error`, `neon`

---

## Tooltip

Подсказка при наведении.

```tsx
import { Tooltip } from '../components/ui'

<Tooltip content="Это подсказка" position="top">
  <button>Наведи на меня</button>
</Tooltip>
```

**Позиции:** `top`, `bottom`, `left`, `right`

