import { useQuery } from '@tanstack/react-query';

export interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export const useNotifications = () => {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Return simulated/mock notifications as backend does not have explicit table/endpoints
      return [] as Notification[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
