import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/shared/utils";

interface SceneVariantCardProps {
  variant: {
    id: string;
    text: string;
    score?: number;
  };
  label?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

/**
 * Card component for displaying scene text variants with selection
 */
export function SceneVariantCard({
  variant,
  label,
  isSelected = false,
  onSelect,
  className,
}: SceneVariantCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:border-primary transition-colors",
        isSelected && "border-primary bg-primary/5",
        className
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {label && (
              <Badge variant="outline" className="font-mono">
                {label}
              </Badge>
            )}
            {variant.score !== undefined && (
              <Badge variant={variant.score >= 75 ? "default" : "secondary"}>
                Score: {variant.score}
              </Badge>
            )}
          </div>
          {isSelected && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Check className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>
        <p className="text-sm leading-relaxed">{variant.text}</p>
      </CardContent>
    </Card>
  );
}
