import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { GuestMusician, CreateGuestMusicianInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useGuestMusicians() {
  return useQuery<GuestMusician[]>({
    queryKey: [api.guestMusicians.list.path],
  });
}

export function useCreateGuestMusician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGuestMusicianInput) => {
      const res = await apiRequest("POST", api.guestMusicians.create.path, input);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.guestMusicians.list.path] });
    },
  });
}

export function useUpdateGuestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", buildUrl(api.guestMusicians.updateStatus.path, { id }), { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.guestMusicians.list.path] });
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/guest-musicians/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.guestMusicians.list.path] });
    },
  });
}

export function useClearCompletedGuests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/guest-musicians/completed/all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.guestMusicians.list.path] });
    },
  });
}
