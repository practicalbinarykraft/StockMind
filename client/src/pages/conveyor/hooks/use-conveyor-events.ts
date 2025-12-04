import { useState, useEffect, useCallback, useRef } from "react";
import { getToken } from "@/lib/auth-context";

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

  const connect = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.error("[SSE] No auth token available");
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
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        credentials: "include",
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      setIsConnected(true);
      console.log("[SSE] Connected to conveyor events");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("[SSE] Stream ended");
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
            } catch (e) {
              // Ignore parse errors for heartbeats
              if (!eventData.startsWith(":")) {
                console.error("[SSE] Parse error:", e);
              }
            }
            eventType = "";
            eventData = "";
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[SSE] Connection aborted");
      } else {
        console.error("[SSE] Connection error:", error);
        setIsConnected(false);
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => connect(), 5000);
      }
    }
  }, []);

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
    const token = getToken();
    if (!token) {
      console.log("[History] No token, skipping history load");
      return;
    }

    try {
      const response = await fetch("/api/conveyor/events/history?limit=50", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check content-type to ensure it's JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("[History] Endpoint returned non-JSON response. Server may need restart.");
        return;
      }

      if (!response.ok) {
        console.warn("[History] Failed to load history:", response.status);
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
          console.log(`[History] Loaded ${historicalMessages.length} historical events`);
        }
      }
    } catch (error) {
      // Silently ignore - history loading is optional
      console.warn("[History] Could not load historical events (this is normal if server was just updated)");
    }
  }, []);

  // Auto-connect on mount and load history
  useEffect(() => {
    loadHistory().then(() => connect());
    return () => disconnect();
  }, [connect, disconnect, loadHistory]);

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
