import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Chat } from '../../types';

const API_URL = '/api';

export interface TransferOwnershipParams {
  chatId: string;
  newOwnerId: string;
}

export const useTransferOwnership = () => {
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, TransferOwnershipParams>({
    mutationFn: async ({ chatId, newOwnerId }) => {
      const res = await axios.put(`${API_URL}/chats/${chatId}/transfer-owner`, { newOwnerId });
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
