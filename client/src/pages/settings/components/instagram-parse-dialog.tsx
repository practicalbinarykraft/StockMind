import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { useInstagramSources } from "../hooks/use-instagram-sources"

export function InstagramParseDialog() {
  const {
    showParseDialog,
    setShowParseDialog,
    parseMode,
    setParseMode,
    selectedParseSource,
    parseMutation,
    limits,
  } = useInstagramSources()

  return (
    <Dialog open={showParseDialog} onOpenChange={setShowParseDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Что парсить из @{selectedParseSource?.username}?</DialogTitle>
          <DialogDescription>
            Выберите режим парсинга - дубликаты пропускаются автоматически
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {/* Быстрая проверка - 10 рилсов */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'latest-10' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('latest-10')}
              data-testid="option-latest-10"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'latest-10' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'latest-10' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Последние 10 Reels</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Быстрая проверка • ~$0.15 Apify • Все 10 получат AI-оценку
                  </p>
                </div>
              </div>
            </div>

            {/* Рекомендуемый - 30 рилсов */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'latest-30' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('latest-30')}
              data-testid="option-latest-30"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'latest-30' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'latest-30' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">Последние {limits?.manualParseDefault || 30} Reels</h4>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Рекомендуем</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Оптимальный вариант • ~$0.45 Apify • AI-оценка для первых {limits?.maxAutoScore || 10}
                  </p>
                </div>
              </div>
            </div>

            {/* Большой парсинг - 50 рилсов */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'latest-50' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('latest-50')}
              data-testid="option-latest-50"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'latest-50' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'latest-50' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Последние 50 Reels</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Большая загрузка • ~$0.70 Apify • AI-оценка для первых {limits?.maxAutoScore || 10}
                  </p>
                </div>
              </div>
            </div>

            {/* Только новые */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'new-only' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('new-only')}
              data-testid="option-new-only"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'new-only' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'new-only' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Только новые с последнего раза</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedParseSource?.lastScrapedDate
                      ? `Reels новее ${formatDistanceToNow(new Date(selectedParseSource.lastScrapedDate), { addSuffix: true, locale: ru })} • Макс 50 шт`
                      : 'Первый парсинг - загрузит до 50 Reels • ~$0.70 Apify'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-md text-sm">
            <p className="font-medium mb-2">📦 Что будет загружено:</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>✓ Видео и превью (сохраняются локально)</li>
              <li>✓ Описание, хэштеги, упоминания</li>
              <li>✓ Статистика (лайки, просмотры, комментарии)</li>
              <li>✓ Автоматическая транскрипция речи (OpenAI Whisper)</li>
              <li>✓ AI-анализ вирусности для первых {limits?.maxAutoScore || 10} рилсов (Anthropic Claude)</li>
              <li>✓ Дубликаты пропускаются автоматически</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">⚡ Оптимизация производительности</p>
            <p className="text-xs text-muted-foreground">
              Загрузка и транскрипция выполняются последовательно (2 параллельно) для стабильной работы сервера.
              AI-оценка ограничена до {limits?.maxAutoScore || 10} рилсов для экономии средств.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending}
            data-testid="button-start-parsing"
          >
            {parseMutation.isPending ? 'Запуск парсинга...' : 'Начать парсинг'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
