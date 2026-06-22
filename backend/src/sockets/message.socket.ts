import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/message.service.js';

export const registerMessageHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
  socket.on('send_message', async ({ chatId, senderId, content }) => {
    try {
      await MessageService.sendMessage(chatId, senderId, content, io, onlineUsers);
    } catch (err: any) {
      console.error('Socket send_message error:', err);
      socket.emit('error', { message: err.message || 'Failed to send message.' });
    }
  });
};
