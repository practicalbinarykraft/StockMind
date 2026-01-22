import { useQuery, useMutation } from "@tanstack/react-query";
import { instagramService } from "../services";
import { queryClient } from "@/shared/api";
import { useToast } from "@/shared/hooks/use-toast";

/**
 * Hook for Instagram accounts
 */
export function useInstagramAccounts() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["/api/ig/accounts"],
    queryFn: () => instagramService.getAccounts(),
  });

  return {
    accounts: accounts || [],
    isLoading,
  };
}

/**
 * Hook for Instagram media
 */
export function useInstagramMedia(accountId?: string) {
  const { data: media, isLoading } = useQuery({
    queryKey: ["/api/ig", accountId, "media"],
    queryFn: () => instagramService.getMedia(accountId!),
    enabled: !!accountId,
  });

  return {
    media: media || [],
    isLoading,
  };
}

/**
 * Hook for Instagram data (combined)
 */
export function useInstagram(accountId?: string) {
  const { accounts, isLoading: accountsLoading } = useInstagramAccounts();
  const { media, isLoading: mediaLoading } = useInstagramMedia(accountId);

  return {
    accounts,
    accountsLoading,
    media,
    mediaLoading,
  };
}

/**
 * Hook for Instagram mutations
 */
export function useInstagramMutations() {
  const { toast } = useToast();

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (accountId: string) => instagramService.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig/accounts"] });
      toast({
        title: "Аккаунт удален",
        description: "Instagram аккаунт успешно удален",
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

  // Sync media mutation
  const syncMediaMutation = useMutation({
    mutationFn: (igMediaId: string) => instagramService.syncMedia(igMediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ig"] });
      toast({
        title: "Синхронизация завершена",
        description: "Данные медиа обновлены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    deleteAccountMutation,
    syncMediaMutation,
  };
}
