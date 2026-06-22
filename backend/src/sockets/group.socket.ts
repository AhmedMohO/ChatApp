import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service.js';

export const registerGroupHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
  socket.on('group_add_member', async ({ chatId, userId }) => {
    try {
      const actionUserId = (socket as any).userId;
      if (!actionUserId) throw new Error('Unauthorized');
      
      await ChatService.addMember(chatId, userId, actionUserId, io);
    } catch (err: any) {
      console.error('Socket group_add_member error:', err);
      socket.emit('error', { message: err.message || 'Failed to add member.' });
    }
  });

  socket.on('group_remove_member', async ({ chatId, memberId }) => {
    try {
      const actionUserId = (socket as any).userId;
      if (!actionUserId) throw new Error('Unauthorized');

      await ChatService.removeMember(chatId, memberId, actionUserId, io, onlineUsers);
    } catch (err: any) {
      console.error('Socket group_remove_member error:', err);
      socket.emit('error', { message: err.message || 'Failed to remove member.' });
    }
  });
};
