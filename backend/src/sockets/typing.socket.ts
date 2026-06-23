import { Server, Socket } from 'socket.io';

export const registerTypingHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
  socket.on('join_chat', (chatId: string) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room ${chatId}`);
  });

  socket.on('leave_chat', (chatId: string) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room ${chatId}`);
  });

  socket.on('typing', ({ chatId, username, isTyping }) => {
    socket.broadcast.to(chatId).emit('user_typing', {
      chatId,
      username,
      isTyping
    });
  });
};
