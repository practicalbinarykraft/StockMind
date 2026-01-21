import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { apiRequest, queryClient } from "@/shared/api";
import { isUnauthorizedError } from "@/shared/utils/auth-utils";
import type { RssSource } from "@shared/schema";

export function useRssSources() {
  const { toast } = useToast();

  // State
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    topic: "",
  });

  // Fetch RSS Sources
  const { data: rssSources, isLoading: sourcesLoading } = useQuery<RssSource[]>({
    queryKey: ["/api/settings/rss-sources"],
  });

  // Add RSS Source Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/settings/rss-sources", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] });
      setShowDialog(false);
      setForm({ name: "", url: "", topic: "" });
      toast({
        title: "RSS Source Added",
        description: "Parsing will begin automatically.",
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

  // Toggle RSS Source Active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/settings/rss-sources/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] });
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

  // Delete RSS Source Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/rss-sources/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] });
      toast({
        title: "RSS Source Deleted",
        description: "The RSS source has been removed.",
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

  // Parse RSS Source Mutation
  const parseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/settings/rss-sources/${id}/parse`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] });
      toast({
        title: "Parsing Started",
        description: "RSS feed parsing has been triggered. Please wait a few seconds.",
      });
      // Refetch after 3 seconds to get updated status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/settings/rss-sources"] });
      }, 3000);
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

  return {
    rssSources,
    sourcesLoading,
    showDialog,
    setShowDialog,
    form,
    setForm,
    addMutation,
    toggleMutation,
    deleteMutation,
    parseMutation,
  };
}
