import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export const useChats = () => {
  return useQuery<Chat[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/chats`);
      return res.data.data;
    },
    staleTime: 0, // Set to 0 to keep the chat list updated and prevent stale caches
    retry: 2,
  });
};

export const useChat = (chatId: string | undefined) => {
  return useQuery<Chat[], Error, Chat | undefined>({
    queryKey: ['chats'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/chats`);
      return res.data.data;
    },
    select: (chats) => chats.find((c) => c._id === chatId),
    enabled: !!chatId,
    staleTime: 0, // Set to 0 to sync with the main chats query key config
  });
};
