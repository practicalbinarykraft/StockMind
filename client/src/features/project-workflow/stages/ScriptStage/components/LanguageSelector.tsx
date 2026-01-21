import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Languages } from "lucide-react"

interface LanguageSelectorProps {
  targetLanguage: 'ru' | 'en'
  setTargetLanguage: (lang: 'ru' | 'en') => void
}

export function LanguageSelector({ targetLanguage, setTargetLanguage }: LanguageSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Languages className="h-5 w-5" />
          Язык сценария
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button
            variant={targetLanguage === 'ru' ? 'default' : 'outline'}
            onClick={() => setTargetLanguage('ru')}
            className="flex-1"
            data-testid="button-lang-ru"
          >
            Русский (RU)
          </Button>
          <Button
            variant={targetLanguage === 'en' ? 'default' : 'outline'}
            onClick={() => setTargetLanguage('en')}
            className="flex-1"
            data-testid="button-lang-en"
          >
            English (EN)
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Выбранный язык: <strong>{targetLanguage === 'ru' ? 'Русский' : 'English'}</strong>
        </p>
      </CardContent>
    </Card>
  )
}
