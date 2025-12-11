import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useAppStore = () => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["app-store"],
    initialData: {
      myValue: null,
    },
  });

  const setStore = (value: any) => {
    queryClient.setQueryData(["app-store"], (old: any) => ({
      ...old,
      ...value,
    }));
  };

  return { store: data, setStore };
};
