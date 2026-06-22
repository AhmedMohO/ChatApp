import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chats.js';
import messageRoutes from './routes/messages.js';

import Message from './models/Message.js';
import Chat from './models/Chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'dist', 'index.html'));
  });
}

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp_clone')
  .then(() => console.log('Connected to MongoDB database successfully.'))
  .catch((err) => console.error('MongoDB database connection error:', err));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.emit('init_connection', {
    status: 'connected',
    message: 'Welcome to the WhatsApp Clone socket server!'
  });

  socket.on('register_user', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`User registered: ${userId} with socket ID: ${socket.id}`);

      socket.join(userId);

      io.emit('user_online_status', {
        userId,
        status: 'online'
      });
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room: ${chatId}`);
  });

  socket.on('send_message', async ({ chatId, senderId, content }) => {
    try {
      const message = new Message({
        chatId,
        senderId,
        content
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username email avatar');

      // Find the chat to get its participants list
      const chat = await Chat.findById(chatId);
      if (chat) {
        // Emit the message to each participant's personal room (userId)
        chat.participants.forEach((pId) => {
          io.to(pId.toString()).emit('receive_message', populatedMessage);
        });
      } else {
        // Fallback: emit to room if chat not found (should not happen)
        io.to(chatId).emit('receive_message', populatedMessage);
      }

      console.log(`Message in chat ${chatId} broadcasted to all participants.`);
    } catch (err) {
      console.error('Socket send_message error:', err);
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  socket.on('typing', ({ chatId, username, isTyping }) => {
    socket.broadcast.to(chatId).emit('user_typing', {
      chatId,
      username,
      isTyping
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      io.emit('user_online_status', {
        userId: disconnectedUserId,
        status: 'offline'
      });
      console.log(`User ${disconnectedUserId} went offline.`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
