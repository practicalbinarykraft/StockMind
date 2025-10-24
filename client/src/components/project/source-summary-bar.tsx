import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Radio, Instagram, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourcePreviewModal } from "./source-preview-modal.tsx";

interface SourceData {
  type: 'news' | 'instagram' | 'custom';
  score?: number;
  language: string;
  wordCount?: number;
  title: string;
  content: string;
}

interface SourceSummaryBarProps {
  source: SourceData;
  collapsed?: boolean;
}

const SOURCE_TYPE_CONFIG = {
  news: { label: 'Новость', icon: Radio },
  instagram: { label: 'Instagram', icon: Instagram },
  custom: { label: 'Свой текст', icon: FileCode },
};

export function SourceSummaryBar({ source, collapsed = false }: SourceSummaryBarProps) {
  const [showModal, setShowModal] = useState(false);
  const { label, icon: Icon } = SOURCE_TYPE_CONFIG[source.type];

  return (
    <>
      <div
        className={cn(
          "bg-muted/50 rounded-lg mb-4 transition-all",
          collapsed ? "p-2" : "p-4"
        )}
        data-testid="source-summary-bar"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1.5">
            <Icon className="h-3 w-3" />
            Источник: {label}
          </Badge>

          {source.score !== undefined && (
            <Badge
              variant={source.score >= 80 ? "default" : "secondary"}
              data-testid="badge-source-score"
            >
              Score: {source.score}/100
            </Badge>
          )}

          <Badge variant="outline">
            Язык: {source.language.toUpperCase()}
          </Badge>

          {source.wordCount && (
            <Badge variant="outline" data-testid="badge-word-count">
              Объём: {source.wordCount.toLocaleString()} слов
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="ml-auto gap-1.5"
            data-testid="button-show-article"
          >
            <FileText className="h-4 w-4" />
            {collapsed ? 'Развернуть' : 'Показать статью'}
          </Button>
        </div>
      </div>

      <SourcePreviewModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={source.title}
        content={source.content}
      />
    </>
  );
}
