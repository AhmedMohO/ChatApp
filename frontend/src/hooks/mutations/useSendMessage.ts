import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Message, Chat } from '../../types';

export const useSendMessage = () => {
  const { socket } = useSocket() as any;
  const { user } = useAuth() as any;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!socket) throw new Error('Socket not connected');
      if (!user) throw new Error('User not authenticated');

      socket.emit('send_message', {
        chatId,
        senderId: user.id || user._id,
        content,
      });

      return { chatId, content };
    },
    onMutate: async ({ chatId, content }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', chatId]);

      // Create an optimistic message object
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        chatId,
        senderId: {
          _id: user?.id || user?._id || '',
          username: user?.username || '',
          email: user?.email || '',
          avatar: user?.avatar || '',
        },
        content,
        status: 'sent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically update messages list
      queryClient.setQueryData<Message[]>(['messages', chatId], (old) => {
        return old ? [...old, tempMessage] : [tempMessage];
      });

      // Snapshot previous chats
      const previousChats = queryClient.getQueryData<Chat[]>(['chats']);

      // Optimistically update the last message in chats list
      queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
        if (!oldChats) return [];
        const updated = oldChats.map((chat) => {
          if (chat._id === chatId) {
            return {
              ...chat,
              lastMessage: tempMessage,
            };
          }
          return chat;
        });

        // Re-sort chats by the newest message
        return [...updated].sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
          return timeB.getTime() - timeA.getTime();
        });
      });

      // Return context containing previous state for rollback
      return { previousMessages, previousChats };
    },
    onError: (err, { chatId }, context) => {
      // Rollback values on failure
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages);
      }
      if (context?.previousChats) {
        queryClient.setQueryData(['chats'], context.previousChats);
      }
    },
  });
};
