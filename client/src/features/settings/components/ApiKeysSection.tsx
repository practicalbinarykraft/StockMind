import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Plus, Trash2, Key, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatusBadge } from "@/shared/components/status-badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useApiKeys } from "../hooks/use-api-keys";
import { API_PROVIDERS } from "../constants";

export function ApiKeysSection() {
  const {
    apiKeys,
    keysLoading,
    showDialog,
    setShowDialog,
    form,
    setForm,
    addMutation,
    deleteMutation,
    testMutation,
  } = useApiKeys();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription className="mt-2">
              Manage your API keys for AI services. All keys are encrypted.
            </CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-api-key">
                <Plus className="h-4 w-4" />
                Add Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
                <DialogDescription>
                  Add a new API key for an AI service provider.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={form.provider}
                    onValueChange={(value) => setForm({ ...form, provider: value })}
                  >
                    <SelectTrigger id="provider" data-testid="select-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {API_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-..."
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value })}
                    data-testid="input-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What this key is used for..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    data-testid="input-description"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addMutation.mutate()}
                  disabled={!form.provider || !form.key || addMutation.isPending}
                  data-testid="button-save-api-key"
                >
                  {addMutation.isPending ? "Saving..." : "Save API Key"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {keysLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border"
                data-testid={`api-key-${key.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold capitalize">{key.provider}</h4>
                    {key.isActive && (
                      <StatusBadge status="success" text="Active" />
                    )}
                  </div>
                  {key.description && (
                    <p className="text-sm text-muted-foreground mb-2">{key.description}</p>
                  )}
                  <code className="text-sm font-mono px-2 py-1 bg-muted rounded">
                    {key.last4 ? `••••${key.last4}` : '••••••••'}
                  </code>
                  {!key.last4 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      Legacy key - consider recreating for better security display
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {formatDistanceToNow(new Date(key.updatedAt), { addSuffix: true, locale: ru })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => testMutation.mutate(key.id)}
                    disabled={testMutation.isPending}
                    data-testid={`button-test-key-${key.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(key.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-key-${key.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No API keys configured yet. Add your first key to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
