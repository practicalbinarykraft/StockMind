import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
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
import { cn } from "@/shared/utils/cn";
import { useMutation } from "@tanstack/react-query";

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
      const res = await fetch("/api/conveyor/events/test", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trigger test");
      return res.json();
    },
  });

  const getMessageIcon = (type: AgentMessage["type"]) => {
    switch (type) {
      case "thinking":
        return <Brain className="h-4 w-4 text-purple-500" />;
      case "stage":
        return <Zap className="h-4 w-4 text-blue-500" />;
      case "item":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMessageColor = (type: AgentMessage["type"]) => {
    switch (type) {
      case "thinking":
        return "border-l-purple-500";
      case "stage":
        return "border-l-blue-500";
      case "item":
        return "border-l-green-500";
      case "error":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

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
              <p>Нет сообщений</p>
              <p className="text-xs">Агенты пока молчат</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 p-2 rounded-md border-l-2 bg-muted/30",
                    getMessageColor(msg.type)
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getMessageIcon(msg.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      {msg.stageName && (
                        <Badge variant="outline" className="text-xs">
                          {msg.stageName}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
