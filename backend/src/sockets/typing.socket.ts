import { Server, Socket } from 'socket.io';

export const registerTypingHandlers = (io: Server, socket: Socket, onlineUsers: Map<string, string>) => {
  socket.on('typing', ({ chatId, username, isTyping }) => {
    socket.broadcast.to(chatId).emit('user_typing', {
      chatId,
      username,
      isTyping
    });
  });
};
