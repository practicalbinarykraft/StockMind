import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Slider } from "@/shared/ui/slider";
import { Separator } from "@/shared/ui/separator";
import { Plus, Clock, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";

interface FormData {
  username: string;
  description: string;
  autoUpdateEnabled: boolean;
  checkIntervalHours: number;
  notifyNewReels: boolean;
  notifyViralOnly: boolean;
  viralThreshold: number;
}

interface InstagramAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormData;
  onFormChange: (form: FormData) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function InstagramAddDialog({ open, onOpenChange, form, onFormChange, onSubmit, isPending }: InstagramAddDialogProps) {
  const updateForm = (updates: Partial<FormData>) => onFormChange({ ...form, ...updates });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-instagram">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Instagram Account</DialogTitle>
          <DialogDescription>Add an Instagram username to scrape Reels content.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram-username">Instagram Username</Label>
            <Input
              id="instagram-username"
              placeholder="например: techcrunch"
              value={form.username}
              onChange={(e) => updateForm({ username: e.target.value })}
              data-testid="input-instagram-username"
            />
            <p className="text-xs text-muted-foreground">
              Введите только имя пользователя без @ и без ссылки.<br />
              Пример: для профиля instagram.com/techcrunch введите: <code className="px-1 py-0.5 bg-muted rounded">techcrunch</code>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram-description">Description (Optional)</Label>
            <Textarea
              id="instagram-description"
              placeholder="Tech news & updates"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              data-testid="input-instagram-description"
              rows={3}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-update-enabled" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Автоматический мониторинг
                </Label>
                <p className="text-xs text-muted-foreground">Проверять новые Reels каждые {form.checkIntervalHours}ч</p>
              </div>
              <Switch
                id="auto-update-enabled"
                checked={form.autoUpdateEnabled}
                onCheckedChange={(checked) => updateForm({ autoUpdateEnabled: checked })}
                data-testid="switch-auto-update"
              />
            </div>

            {form.autoUpdateEnabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Интервал проверки</Label>
                    <span className="text-sm text-muted-foreground">
                      {form.checkIntervalHours} {form.checkIntervalHours === 1 ? 'час' : 'часов'}
                    </span>
                  </div>
                  <Slider
                    min={1} max={168} step={1}
                    value={[form.checkIntervalHours]}
                    onValueChange={(value) => updateForm({ checkIntervalHours: value[0] })}
                    data-testid="slider-check-interval"
                  />
                  <p className="text-xs text-muted-foreground">От 1 часа до 168 часов (1 неделя)</p>
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify-new-reels" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Уведомления о новых Reels
                    </Label>
                    <p className="text-xs text-muted-foreground">Получать уведомления при обнаружении новых Reels</p>
                  </div>
                  <Switch
                    id="notify-new-reels"
                    checked={form.notifyNewReels}
                    onCheckedChange={(checked) => updateForm({ notifyNewReels: checked })}
                    data-testid="switch-notify-new-reels"
                  />
                </div>

                {form.notifyNewReels && (
                  <>
                    <div className="flex items-center justify-between pl-6">
                      <div className="space-y-0.5">
                        <Label htmlFor="notify-viral-only" className="text-sm">Только вирусный контент</Label>
                        <p className="text-xs text-muted-foreground">Уведомлять только если AI score ≥ {form.viralThreshold}</p>
                      </div>
                      <Switch
                        id="notify-viral-only"
                        checked={form.notifyViralOnly}
                        onCheckedChange={(checked) => updateForm({ notifyViralOnly: checked })}
                        data-testid="switch-notify-viral-only"
                      />
                    </div>

                    {form.notifyViralOnly && (
                      <div className="space-y-2 pl-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Порог вирусности</Label>
                          <span className="text-sm text-muted-foreground">{form.viralThreshold}</span>
                        </div>
                        <Slider
                          min={50} max={100} step={5}
                          value={[form.viralThreshold]}
                          onValueChange={(value) => updateForm({ viralThreshold: value[0] })}
                          data-testid="slider-viral-threshold"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={!form.username || isPending}
            data-testid="button-save-instagram"
          >
            {isPending ? "Adding..." : "Add Instagram Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
