import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { apiRequest } from "@/shared/api";

/**
 * Hook for managing Instagram Reel processing (transcription and scoring)
 * Tracks individual item states and provides handlers for processing actions
 */
export function useInstagramProcessing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track which items are currently being processed
  const [processingStates, setProcessingStates] = useState<{
    transcribing: Set<string>;
    analyzing: Set<string>;
    processing: Set<string>;
  }>({
    transcribing: new Set(),
    analyzing: new Set(),
    processing: new Set(),
  });

  /**
   * Start transcription for an Instagram Reel
   * Downloads video and extracts audio for transcription
   */
  const handleTranscribe = async (item: any) => {
    const itemId = item.id;
    
    // Add to transcribing state
    setProcessingStates((prev) => ({
      ...prev,
      transcribing: new Set(prev.transcribing).add(itemId),
    }));

    try {
      const res = await apiRequest("POST", `/api/instagram/items/${itemId}/transcribe`, {});
      const result = await res.json();

      toast({
        title: "Транскрипция запущена",
        description: "Обработка видео началась. Это может занять несколько минут.",
      });

      // Refresh items to show updated transcription status
      await queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] });
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error("Error starting transcription:", error);
      
      toast({
        title: "Ошибка транскрипции",
        description: error.message || "Не удалось запустить транскрипцию",
        variant: "destructive",
      });
      
      return { success: false, error };
    } finally {
      // Remove from transcribing state
      setProcessingStates((prev) => {
        const next = new Set(prev.transcribing);
        next.delete(itemId);
        return { ...prev, transcribing: next };
      });
    }
  };

  /**
   * Analyze Instagram Reel with AI scoring
   * Requires transcription to be completed first
   */
  const handleAnalyze = async (item: any) => {
    const itemId = item.id;

    // Validate transcription is completed
    if (!item.transcriptionText || item.transcriptionStatus !== "completed") {
      toast({
        title: "Ошибка",
        description: "Транскрипция должна быть завершена перед анализом",
        variant: "destructive",
      });
      return { success: false, error: "Transcription not completed" };
    }

    // Add to analyzing state
    setProcessingStates((prev) => ({
      ...prev,
      analyzing: new Set(prev.analyzing).add(itemId),
    }));

    try {
      const res = await apiRequest("POST", `/api/instagram/items/${itemId}/score`, {});
      const result = await res.json();

      toast({
        title: "Анализ завершен",
        description: `Оценка: ${result.score}/100`,
      });

      // Refresh items to show updated AI scores
      await queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] });
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error("Error analyzing Instagram reel:", error);
      
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось проанализировать рилс",
        variant: "destructive",
      });
      
      return { success: false, error };
    } finally {
      // Remove from analyzing state
      setProcessingStates((prev) => {
        const next = new Set(prev.analyzing);
        next.delete(itemId);
        return { ...prev, analyzing: next };
      });
    }
  };

  /**
   * Process Instagram Reel (full pipeline)
   * Starts transcription if needed, then prepares for scoring
   */
  const handleProcess = async (item: any) => {
    const itemId = item.id;
    
    // Add to processing state
    setProcessingStates((prev) => ({
      ...prev,
      processing: new Set(prev.processing).add(itemId),
    }));

    try {
      // Check if transcription is needed
      const needsTranscription = !item.transcriptionText || item.transcriptionStatus !== "completed";

      if (needsTranscription) {
        toast({
          title: "Запуск обработки",
          description: "Транскрибируем видео...",
        });

        // Start transcription
        const transcribeRes = await apiRequest("POST", `/api/instagram/items/${itemId}/transcribe`, {});
        const transcribeResult = await transcribeRes.json();

        toast({
          title: "Транскрипция запущена",
          description: "После завершения транскрипции можно будет запустить оценку вручную",
        });

        // Refresh to show transcription status
        await queryClient.invalidateQueries({ queryKey: ["/api/instagram/items"] });
        
        return { success: true, data: transcribeResult, step: "transcription_started" };
      } else {
        // Transcription already exists, user can proceed to scoring
        toast({
          title: "Транскрипция готова",
          description: "Теперь можно запустить AI оценку",
        });
        
        return { success: true, step: "transcription_completed" };
      }
    } catch (error: any) {
      console.error("Error processing Instagram reel:", error);
      
      toast({
        title: "Ошибка обработки",
        description: error.message || "Не удалось обработать рилс",
        variant: "destructive",
      });
      
      return { success: false, error };
    } finally {
      // Remove from processing state
      setProcessingStates((prev) => {
        const next = new Set(prev.processing);
        next.delete(itemId);
        return { ...prev, processing: next };
      });
    }
  };

  /**
   * Check if an item is currently being transcribed
   */
  const isTranscribing = (itemId: string) => {
    return processingStates.transcribing.has(itemId);
  };

  /**
   * Check if an item is currently being analyzed
   */
  const isAnalyzing = (itemId: string) => {
    return processingStates.analyzing.has(itemId);
  };

  /**
   * Check if an item is currently being processed
   */
  const isProcessing = (itemId: string) => {
    return processingStates.processing.has(itemId);
  };

  return {
    // Handlers
    handleTranscribe,
    handleAnalyze,
    handleProcess,
    
    // State checkers
    isTranscribing,
    isAnalyzing,
    isProcessing,
    
    // Raw states (for debugging or advanced usage)
    processingStates,
  };
}
