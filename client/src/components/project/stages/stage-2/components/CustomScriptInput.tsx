import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CustomScriptInputProps {
  customText: string
  onTextChange: (text: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function CustomScriptInput({
  customText,
  onTextChange,
  onSubmit,
  isSubmitting,
}: CustomScriptInputProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="custom-text">Your Script</Label>
            <Textarea
              id="custom-text"
              placeholder="Enter your script or text content here..."
              value={customText}
              onChange={(e) => onTextChange(e.target.value)}
              rows={12}
              className="mt-2"
              data-testid="textarea-custom-script"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {customText.length} characters
            </p>
          </div>
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={!customText.trim() || isSubmitting}
            className="w-full sm:w-auto"
            data-testid="button-save-custom"
          >
            {isSubmitting ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

