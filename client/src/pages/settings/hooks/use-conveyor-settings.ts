import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth-context";

export interface StylePreferences {
  formality: 'formal' | 'conversational' | 'casual';
  tone: 'serious' | 'engaging' | 'funny' | 'motivational';
  language: 'ru' | 'en';
}

export interface DurationRange {
  min: number;
  max: number;
}

export interface CustomPrompts {
  writerPrompt?: string;
  architectPrompt?: string;
  analystPrompt?: string;
  scorerPrompt?: string;
}

export interface ConveyorSettings {
  id: string;
  userId: string;
  enabled: boolean;
  sourceTypes: string[];
  sourceIds: string[] | null;
  keywords: string[] | null;
  excludeKeywords: string[] | null;
  maxAgeDays: number;
  minScoreThreshold: number;
  dailyLimit: number;
  monthlyBudgetLimit: string;
  itemsProcessedToday: number;
  currentMonthCost: string;
  learnedThreshold: number | null;
  avoidedTopics: string[];
  preferredFormats: string[];
  totalProcessed: number;
  totalPassed: number;
  totalFailed: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: string | null;
  // Phase 1: Style customization
  stylePreferences: StylePreferences;
  customGuidelines: string[];
  durationRange: DurationRange;
  // Phase 2: Custom prompts
  customPrompts: CustomPrompts | null;
}

export interface ConveyorStats {
  totalProcessed: number;
  totalPassed: number;
  totalFailed: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: string | null;
  itemsProcessedToday: number;
  dailyLimit: number;
  currentMonthCost: string;
  monthlyBudgetLimit: string;
  learnedThreshold: number | null;
  avoidedTopics: string[];
  preferredFormats: string[];
}

export function useConveyorSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery<ConveyorSettings>({
    queryKey: ["conveyor-settings"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch("/api/conveyor/settings", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
  } = useQuery<ConveyorStats>({
    queryKey: ["conveyor-stats"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch("/api/conveyor/stats", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ConveyorSettings>) => {
      const token = getToken();
      const res = await fetch("/api/conveyor/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-settings"] });
      queryClient.invalidateQueries({ queryKey: ["conveyor-stats"] });
      toast({
        title: "Настройки сохранены",
        description: "Настройки Content Factory обновлены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle enabled
  const toggleEnabled = () => {
    if (settings) {
      updateMutation.mutate({ enabled: !settings.enabled });
    }
  };

  // Reset learning data
  const resetLearningMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch("/api/conveyor/settings/reset-learning", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to reset learning data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-settings"] });
      queryClient.invalidateQueries({ queryKey: ["conveyor-stats"] });
      toast({
        title: "Данные обучения сброшены",
        description: "Система начнёт обучение заново",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Trigger conveyor manually
  const triggerMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch("/api/conveyor/trigger", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to trigger conveyor");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conveyor-stats"] });
      toast({
        title: "Конвейер запущен",
        description: "Обработка началась в фоновом режиме",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка запуска",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    settingsLoading,
    settingsError,
    stats,
    statsLoading,
    updateMutation,
    toggleEnabled,
    resetLearningMutation,
    triggerMutation,
  };
}
