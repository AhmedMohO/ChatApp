import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Message } from '../../types';

const API_URL = '/api';

export const useMessages = (chatId: string | undefined) => {
  return useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/messages/${chatId}`);
      return res.data.data;
    },
    enabled: !!chatId,
    staleTime: 0, // Set to 0 to trigger backend fetch and seen logic on mount / chat selection
    retry: 1,
  });
};
