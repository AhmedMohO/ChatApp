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
    staleTime: 1000 * 60 * 60, // Chats are kept synchronized via Socket.IO events, safe to cache long-term
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
    staleTime: Infinity,
  });
};
