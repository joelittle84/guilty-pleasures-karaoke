import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSong, type Song } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// GET /api/songs
export function useSongs(search?: string, activeOnly: boolean = true, group?: string) {
  return useQuery({
    queryKey: [api.songs.list.path, { search, activeOnly, group }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (!activeOnly) params.set("activeOnly", "false");
      if (group && group !== "all") params.set("group", group);
      const url = params.toString() ? `${api.songs.list.path}?${params}` : api.songs.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch songs");
      return res.json() as Promise<Song[]>;
    },
  });
}

// POST /api/songs
export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSong) => {
      const validated = api.songs.create.input.parse(data);
      const res = await fetch(api.songs.create.path, {
        method: api.songs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create song");
      return res.json() as Promise<Song>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}

// DELETE /api/songs/:id
export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.songs.delete.path, { id });
      const res = await fetch(url, { method: api.songs.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete song");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}

// POST /api/songs/bulk-delete
export function useDeleteSongs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/songs/bulk-delete", { ids });
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}

// PATCH /api/songs/:id/toggle
export function useToggleSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/songs/${id}/toggle`);
      return res.json() as Promise<Song>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}

// GET /api/songs/groups (protected)
export function useSongGroups() {
  return useQuery({
    queryKey: ["/api/songs/groups"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/songs/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json() as Promise<{ group: string; count: number; activeCount: number }[]>;
    },
  });
}

// PATCH /api/songs/groups/:group/toggle (protected)
export function useToggleGroupActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ group, isActive }: { group: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/songs/groups/${encodeURIComponent(group)}/toggle`, { isActive });
      if (!res.ok) throw new Error("Failed to toggle group");
      return res.json() as Promise<{ updated: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/groups"] });
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}
