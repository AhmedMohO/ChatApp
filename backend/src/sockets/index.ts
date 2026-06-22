import { Server, Socket } from 'socket.io';
import { registerPresenceHandlers } from './presence.socket.js';
import { registerMessageHandlers } from './message.socket.js';
import { registerGroupHandlers } from './group.socket.js';
import { registerTypingHandlers } from './typing.socket.js';

export const onlineUsers = new Map<string, string>();

export const initSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.emit('init_connection', {
      status: 'connected',
      message: 'Welcome to the WhatsApp Clone socket server!'
    });

    registerPresenceHandlers(io, socket, onlineUsers);
    registerMessageHandlers(io, socket, onlineUsers);
    registerGroupHandlers(io, socket, onlineUsers);
    registerTypingHandlers(io, socket, onlineUsers);
  });
};
