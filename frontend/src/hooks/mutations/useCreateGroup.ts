import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface CreateChatParams {
  type: 'private' | 'group';
  recipientId?: string;
  groupName?: string;
  participants?: string[];
}

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, CreateChatParams>({
    mutationFn: async (params) => {
      const res = await axios.post(`${API_URL}/chats`, params);
      return res.data.data;
    },
    onSuccess: (newChat) => {
      // Optimistically push the newly created chat to the top of the chats list
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [newChat];
        if (oldChats.some((c) => c._id === newChat._id)) return oldChats;
        return [newChat, ...oldChats];
      });
    },
  });
};
