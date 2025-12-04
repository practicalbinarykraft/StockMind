import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ScriptEditorProps {
  value: string
  onChange: (value: string) => void
}

export function ScriptEditor({ value, onChange }: ScriptEditorProps) {
  const wordCount = value.trim() ? value.split(/\s+/).length : 0
  const estimatedMinutes = Math.ceil(wordCount / 150)

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
          rows={8}
          className="mt-2"
          data-testid="textarea-final-script"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {value.length} characters • Est. {estimatedMinutes} min
        </p>
      </CardContent>
    </Card>
  )
}
