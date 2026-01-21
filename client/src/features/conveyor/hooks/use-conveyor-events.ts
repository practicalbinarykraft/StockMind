import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/features/auth";

/**
 * SSE hook for Conveyor Events
 *
 * Authentication via httpOnly cookies (automatic with credentials: 'include')
 */

export interface ConveyorEvent {
  type: string;
  userId: string;
  itemId: string;
  timestamp: string;
  data: {
    stage?: number;
    stageName?: string;
    message?: string;
    thinking?: string;
    progress?: number;
    result?: any;
    error?: string;
  };
}

export interface AgentMessage {
  id: string;
  type: "thinking" | "stage" | "item" | "error" | "system";
  stage?: number;
  stageName?: string;
  message: string;
  timestamp: Date;
  itemId: string;
}

export function useConveyorEvents() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated } = useAuth();

  const connect = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    // Close existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/conveyor/events", {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        credentials: "include", // Sends httpOnly cookie automatically
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      setIsConnected(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsConnected(false);
          // Attempt reconnection after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => connect(), 5000);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            eventData = line.slice(5).trim();
          } else if (line === "" && eventData) {
            // End of event
            try {
              const data: ConveyorEvent = JSON.parse(eventData);

              const newMessage: AgentMessage = {
                id: `${data.itemId}-${Date.now()}-${Math.random()}`,
                type: getMessageType(data.type || eventType),
                stage: data.data.stage,
                stageName: data.data.stageName,
                message: data.data.message || data.data.thinking || "",
                timestamp: new Date(data.timestamp),
                itemId: data.itemId,
              };

              // Track processing state
              if (data.type === "item:started") {
                setIsProcessing(true);
              } else if (data.type === "item:completed" || data.type === "item:failed") {
                setIsProcessing(false);
              }

              setMessages((prev) => [...prev, newMessage].slice(-100));
            } catch {
              // Ignore parse errors for heartbeats
            }
            eventType = "";
            eventData = "";
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setIsConnected(false);
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => connect(), 5000);
      }
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Load historical events from database
  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await fetch("/api/conveyor/events/history?limit=50", {
        credentials: "include",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.events && Array.isArray(data.events)) {
        const historicalMessages: AgentMessage[] = data.events.map((event: ConveyorEvent) => ({
          id: `hist-${event.itemId}-${new Date(event.timestamp).getTime()}-${Math.random()}`,
          type: getMessageType(event.type),
          stage: event.data.stage,
          stageName: event.data.stageName,
          message: event.data.message || event.data.thinking || "",
          timestamp: new Date(event.timestamp),
          itemId: event.itemId,
        }));

        if (historicalMessages.length > 0) {
          setMessages(historicalMessages);
        }
      }
    } catch {
      // Silently ignore - history loading is optional
    }
  }, [isAuthenticated]);

  // Auto-connect on mount and load history
  useEffect(() => {
    if (isAuthenticated) {
      loadHistory().then(() => connect());
    }
    return () => disconnect();
  }, [connect, disconnect, loadHistory, isAuthenticated]);

  return {
    messages,
    isConnected,
    isProcessing,
    connect,
    disconnect,
    clearMessages,
  };
}

function getMessageType(eventType: string): AgentMessage["type"] {
  if (eventType.includes("thinking")) return "thinking";
  if (eventType.includes("stage")) return "stage";
  if (eventType.includes("item")) return "item";
  if (eventType.includes("failed") || eventType.includes("error")) return "error";
  return "system";
}
