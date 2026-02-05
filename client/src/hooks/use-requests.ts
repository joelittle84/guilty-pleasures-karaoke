import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRequestInput, type UpdateRequestStatusInput } from "@shared/routes";

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
    refetchInterval: 10000, // Poll every 10s for new requests during live show
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
