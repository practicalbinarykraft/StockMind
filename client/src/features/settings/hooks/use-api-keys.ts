import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { queryClient } from "@/shared/api";
import { isUnauthorizedError } from "@/shared/utils/auth-utils";
import { SafeApiKey } from "../types";
import { API_PROVIDERS } from "../constants";
import { settingsService } from "../services";

export function useApiKeys() {
  const { toast } = useToast();

  // State
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    provider: "",
    key: "",
    description: "",
  });

  // Fetch API Keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery<SafeApiKey[]>({
    queryKey: ["/api/settings/api-keys"],
    queryFn: () => settingsService.getApiKeys(),
  });

  // Add API Key Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const provider = API_PROVIDERS.find(p => p.value === form.provider);
      return settingsService.addApiKey(
        form.provider,
        form.key,
        form.description || provider?.description
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] });
      setShowDialog(false);
      setForm({ provider: "", key: "", description: "" });
      toast({
        title: "API Key Added",
        description: "Your API key has been securely saved.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete API Key Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return settingsService.deleteApiKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been removed.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test API Key Mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return await settingsService.testApiKey(id);
    },
    onSuccess: (data: any) => {
      toast({
        title: "API Key Test Successful",
        description: data?.message || "The API key is working correctly!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "API Key Test Failed",
        description: error.message || "The API key appears to be invalid",
        variant: "destructive",
      });
    },
  });

  return {
    apiKeys,
    keysLoading,
    showDialog,
    setShowDialog,
    form,
    setForm,
    addMutation,
    deleteMutation,
    testMutation,
  };
}
