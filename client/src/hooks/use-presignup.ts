import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PreSignup, PreSignupConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function usePreSignupConfig() {
  return useQuery<PreSignupConfig>({
    queryKey: ["/api/presignup/config"],
    refetchInterval: 30000,
  });
}

export function usePreSignups() {
  return useQuery<PreSignup[]>({
    queryKey: ["/api/presignup"],
  });
}

export function useCreatePreSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/presignup", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to pre-register");
      }
      return res.json() as Promise<PreSignup>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presignup/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presignup"] });
    },
  });
}

export function useDeletePreSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/presignup/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presignup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presignup/config"] });
    },
  });
}

export function useClearPreSignups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/presignup");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presignup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presignup/config"] });
    },
  });
}
