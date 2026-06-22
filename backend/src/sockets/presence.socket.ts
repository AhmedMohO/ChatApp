import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/message.service.js';

export const registerPresenceHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
  socket.on('register_user', async (userId: string) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      (socket as any).userId = userId;
      console.log(`User registered: ${userId} with socket ID: ${socket.id}`);

      socket.join(userId);

      io.emit('user_online_status', {
        userId,
        status: 'online'
      });

      // Deliver pending offline messages
      try {
        await MessageService.deliverOfflineMessages(userId, io);
      } catch (err) {
        console.error('Error delivering offline messages in socket:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const disconnectedUserId = (socket as any).userId;
    if (disconnectedUserId) {
      const remainingSockets = io.sockets.adapter.rooms.get(disconnectedUserId);
      if (!remainingSockets || remainingSockets.size === 0) {
        onlineUsers.delete(disconnectedUserId);
        io.emit('user_online_status', {
          userId: disconnectedUserId,
          status: 'offline'
        });
        console.log(`User ${disconnectedUserId} went offline.`);
      }
    }
  });
};
