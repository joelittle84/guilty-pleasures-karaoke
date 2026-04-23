import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSong, type Song } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

// GET /api/songs
export function useSongs(search?: string, activeOnly: boolean = true) {
  return useQuery({
    queryKey: [api.songs.list.path, { search, activeOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (!activeOnly) params.set("activeOnly", "false");
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
