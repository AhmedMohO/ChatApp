import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface AddMemberParams {
  chatId: string;
  userId: string;
}

export const useAddMember = () => {
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, AddMemberParams>({
    mutationFn: async ({ chatId, userId }) => {
      const res = await axios.post(`${API_URL}/chats/${chatId}/members`, { userId });
      return res.data.data;
    },
    onSuccess: (updatedChat, { chatId }) => {
      // Update chats list with the updated group information
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [updatedChat];
        return oldChats.map((c) => (c._id === chatId ? updatedChat : c));
      });
    },
  });
};
