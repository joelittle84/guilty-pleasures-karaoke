import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSettings(key: string) {
  return useQuery<{ value: string }>({
    queryKey: [buildUrl(api.settings.get.path, { key })],
    retry: false,
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch(buildUrl(api.settings.update.path, { key }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.settings.get.path, { key })] });
      queryClient.invalidateQueries({ queryKey: ["/api/booking/page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tips"] });
    },
  });
}
