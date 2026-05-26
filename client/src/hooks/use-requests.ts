import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateRequestInput, type UpdateRequestStatusInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// GET /api/requests (Protected)
export function useRequests(status?: string) {
  return useQuery({
    queryKey: [api.requests.list.path, { status }],
    queryFn: async () => {
      const url = status 
        ? `${api.requests.list.path}?status=${status}` 
        : api.requests.list.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
         if (res.status === 401) return null; // Handle auth redirect in UI
         throw new Error("Failed to fetch requests");
      }
      // Note: we're using custom<any> in schema for response, but it matches RequestsListResponse
      return await res.json();
    },
    staleTime: 0,
    refetchInterval: 3000, // Poll every 3s for new requests during live show
    refetchOnWindowFocus: true,
  });
}

// POST /api/requests
export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRequestInput) => {
      const validated = api.requests.create.input.parse(data);
      const res = await fetch(api.requests.create.path, {
        method: api.requests.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      return await res.json();
    },
    onSuccess: () => {
      // In a real app we might update a local "my requests" cache
    },
  });
}

// PATCH /api/requests/:id/status
export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number } & UpdateRequestStatusInput) => {
      const url = buildUrl(api.requests.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.requests.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.requests.list.path] });
    },
  });
}

// DELETE /api/requests/:id/songs/:songId — remove one song from a request
export function useRemoveRequestSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, songId }: { requestId: number; songId: number }) => {
      const res = await fetch(`/api/requests/${requestId}/songs/${songId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove song");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.requests.list.path] });
    },
  });
}

// DELETE /api/requests/:id — remove entire request
export function useDeleteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.requests.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete request");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.requests.list.path] });
    },
  });
}
