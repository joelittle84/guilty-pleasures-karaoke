import { useQuery } from "@tanstack/react-query";

interface QueueInfo {
  queueLength: number;
  estimatedMinutes: number;
}

export function useQueueInfo() {
  return useQuery<QueueInfo>({
    queryKey: ["/api/queue-info"],
    refetchInterval: 15000,
  });
}
