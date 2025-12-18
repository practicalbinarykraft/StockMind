import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save, Loader2 } from "lucide-react"

interface ScriptEditorProps {
  value: string
  onChange: (value: string) => void
  savedScript?: string
  onSave?: (script: string) => Promise<void>
  isSaving?: boolean
}

export function ScriptEditor({ value, onChange, savedScript, onSave, isSaving = false }: ScriptEditorProps) {
  const [hasChanges, setHasChanges] = useState(false)
  
  const wordCount = value.trim() ? value.split(/\s+/).length : 0
  const estimatedMinutes = Math.ceil(wordCount / 150)

  // Track changes when user edits the script
  useEffect(() => {
    const scriptToCompare = savedScript || ""
    setHasChanges(value !== scriptToCompare)
  }, [value, savedScript])

  const handleSave = async () => {
    if (onSave && hasChanges) {
      await onSave(value)
      setHasChanges(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Script</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="final-script">Review and edit your script</Label>
        <Textarea
          id="final-script"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          className="mt-2"
          data-testid="textarea-final-script"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {value.length} characters • Est. {estimatedMinutes} min
          </p>
          {onSave && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              data-testid="button-save-script"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
