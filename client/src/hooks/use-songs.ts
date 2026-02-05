import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSong, type Song } from "@shared/routes";

// GET /api/songs
export function useSongs(search?: string) {
  return useQuery({
    queryKey: [api.songs.list.path, { search }],
    queryFn: async () => {
      const url = search 
        ? `${api.songs.list.path}?search=${encodeURIComponent(search)}` 
        : api.songs.list.path;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch songs");
      return api.songs.list.responses[200].parse(await res.json());
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
      return api.songs.create.responses[201].parse(await res.json());
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
      const res = await fetch(url, {
        method: api.songs.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete song");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.songs.list.path] });
    },
  });
}
