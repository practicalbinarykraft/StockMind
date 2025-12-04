import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  Trash2,
  Play
} from "lucide-react";
import { useConveyorEvents, type AgentMessage } from "../hooks/use-conveyor-events";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { getToken } from "@/lib/auth-context";

interface AgentThinkingSidebarProps {
  className?: string;
}

export function AgentThinkingSidebar({ className }: AgentThinkingSidebarProps) {
  const { messages, isConnected, isProcessing, clearMessages } = useConveyorEvents();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Test mutation to trigger demo events
  const testMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch("/api/conveyor/events/test", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to trigger test");
      return res.json();
    },
  });

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5" />
            Мысли агентов
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="default" className="bg-blue-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Работает
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            <Play className="h-3 w-3 mr-1" />
            Тест
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Очистить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <Brain className="h-8 w-8 mb-2 opacity-50" />
              <p>Ожидание событий...</p>
              <p className="text-xs mt-1">Запустите конвейер чтобы видеть мысли</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  const getIcon = () => {
    switch (message.type) {
      case "thinking":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case "stage":
        if (message.message.includes("Готово") || message.message.includes("completed")) {
          return <CheckCircle2 className="h-3 w-3 text-green-500" />;
        }
        return <Zap className="h-3 w-3 text-yellow-500" />;
      case "item":
        if (message.message.includes("Сценарий готов")) {
          return <CheckCircle2 className="h-3 w-3 text-green-500" />;
        }
        return <Brain className="h-3 w-3 text-purple-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Zap className="h-3 w-3 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (message.type) {
      case "thinking":
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
      case "error":
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
      case "item":
        if (message.message.includes("Сценарий готов")) {
          return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
        }
        return "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800";
    }
  };

  return (
    <div
      className={cn(
        "p-2 rounded-lg border text-sm",
        getBgColor()
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          {message.stageName && (
            <span className="font-medium text-xs text-muted-foreground">
              {message.stageName}:&nbsp;
            </span>
          )}
          <span className="text-foreground">{message.message}</span>
          <div className="text-xs text-muted-foreground mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
