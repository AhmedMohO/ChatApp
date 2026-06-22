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
    staleTime: 1000 * 60 * 60, // Keep cached; updates occur in real time via socket.io
    retry: 1,
  });
};
