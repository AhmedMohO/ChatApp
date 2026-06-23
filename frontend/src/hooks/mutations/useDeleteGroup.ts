import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface DeleteGroupParams {
  chatId: string;
}

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteGroupParams>({
    mutationFn: async ({ chatId }) => {
      await axios.delete(`${API_URL}/chats/${chatId}`);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [];
        return oldChats.filter((c) => c._id !== chatId);
      });
    },
  });
};
