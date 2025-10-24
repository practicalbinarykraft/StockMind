import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SourcePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function SourcePreviewModal({
  open,
  onClose,
  title,
  content,
}: SourcePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="modal-source-preview">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
