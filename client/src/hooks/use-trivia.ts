import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TriviaSessionPublic } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useActiveTrivia() {
  return useQuery<TriviaSessionPublic | null>({
    queryKey: ["/api/trivia/active"],
    refetchInterval: 3000,
  });
}

export function useCreateTriviaSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ songTitle, songArtist }: { songTitle: string; songArtist: string }) => {
      const res = await apiRequest("POST", "/api/trivia/sessions", { songTitle, songArtist });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}

export function useUpdateTriviaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "waiting" | "active" | "completed" }) => {
      const res = await apiRequest("PATCH", `/api/trivia/sessions/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}

export function useAdvanceTriviaQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/trivia/sessions/${id}/next`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}

export function useDeleteAllTrivia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/trivia/sessions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}

export function useJoinTrivia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, playerName }: { sessionId: number; playerName: string }) => {
      const res = await apiRequest("POST", "/api/trivia/join", { sessionId, playerName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}

export function useSubmitTriviaAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, playerName, answerIndex }: { sessionId: number; playerName: string; answerIndex: number }) => {
      const res = await apiRequest("POST", "/api/trivia/answer", { sessionId, playerName, answerIndex });
      return res.json() as Promise<{ correct: boolean; score: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/active"] });
    },
  });
}
