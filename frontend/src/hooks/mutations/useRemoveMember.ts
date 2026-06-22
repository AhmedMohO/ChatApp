import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface RemoveMemberParams {
  chatId: string;
  memberId: string;
}

export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, RemoveMemberParams>({
    mutationFn: async ({ chatId, memberId }) => {
      const res = await axios.delete(`${API_URL}/chats/${chatId}/members/${memberId}`);
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
