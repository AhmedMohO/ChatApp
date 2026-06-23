import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface LeaveGroupParams {
  chatId: string;
}

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, LeaveGroupParams>({
    mutationFn: async ({ chatId }) => {
      const res = await axios.post(`${API_URL}/chats/${chatId}/leave`);
      return res.data.data;
    },
    onSuccess: (data, { chatId }) => {
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [];
        return oldChats.filter((c) => c._id !== chatId);
      });
    },
  });
};
