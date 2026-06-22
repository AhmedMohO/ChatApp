import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface UpdateGroupParams {
  chatId: string;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
}

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, UpdateGroupParams>({
    mutationFn: async ({ chatId, ...params }) => {
      const res = await axios.put(`${API_URL}/chats/${chatId}`, params);
      return res.data.data;
    },
    onSuccess: (updatedChat, { chatId }) => {
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [updatedChat];
        return oldChats.map((c) => (c._id === chatId ? updatedChat : c));
      });
    },
  });
};
