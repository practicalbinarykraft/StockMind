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
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'latest-20' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('latest-20')}
              data-testid="option-latest-20"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'latest-20' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'latest-20' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Последние 20 Reels</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Быстрая проверка новых Reels • ~$0.30 Apify
                  </p>
                </div>
              </div>
            </div>

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
                    Оптимальный вариант • ~$0.70 Apify
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer transition-all hover-elevate ${
                parseMode === 'latest-100' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setParseMode('latest-100')}
              data-testid="option-latest-100"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  parseMode === 'latest-100' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {parseMode === 'latest-100' && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Последние 100 Reels</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Полная загрузка архива • ~$1.30 Apify
                  </p>
                </div>
              </div>
            </div>

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
                      ? `Reels новее ${formatDistanceToNow(new Date(selectedParseSource.lastScrapedDate), { addSuffix: true, locale: ru })} • Макс 100 шт`
                      : 'Первый парсинг - загрузит до 100 Reels • ~$1.30 Apify'
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
              <li>✓ AI-анализ вирусности (Anthropic Claude)</li>
              <li>✓ Дубликаты пропускаются автоматически</li>
            </ul>
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
