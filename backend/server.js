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

app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

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

  socket.on('register_user', async (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User registered: ${userId} with socket ID: ${socket.id}`);

      socket.join(userId);

      io.emit('user_online_status', {
        userId,
        status: 'online'
      });

      // Deliver pending messages sent to this user while they were offline
      try {
        const userChats = await Chat.find({ participants: userId });
        const chatIds = userChats.map(c => c._id);

        const sentMessages = await Message.find({
          chatId: { $in: chatIds },
          senderId: { $ne: userId },
          status: 'sent'
        });

        if (sentMessages.length > 0) {
          const msgIds = sentMessages.map(m => m._id);
          await Message.updateMany(
            { _id: { $in: msgIds } },
            { $set: { status: 'delivered' } }
          );

          const chatUpdates = {};
          sentMessages.forEach(msg => {
            const cId = msg.chatId.toString();
            if (!chatUpdates[cId]) {
              chatUpdates[cId] = [];
            }
            chatUpdates[cId].push(msg._id);
          });

          for (const [cId, ids] of Object.entries(chatUpdates)) {
            const chat = userChats.find(c => c._id.toString() === cId);
            if (chat) {
              chat.participants.forEach(pId => {
                io.to(pId.toString()).emit('message_status_update', {
                  chatId: cId,
                  messageIds: ids,
                  status: 'delivered'
                });
              });
            }
          }
        }
      } catch (err) {
        console.error('Error delivering pending messages:', err);
      }
    }
  });

  socket.on('join_chat', async (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);

    let userId = socket.userId;
    if (!userId) {
      for (const [uId, sId] of onlineUsers.entries()) {
        if (sId === socket.id) {
          userId = uId;
          socket.userId = uId;
          break;
        }
      }
    }

    if (userId) {
      try {
        const unseenMessages = await Message.find({
          chatId,
          senderId: { $ne: userId },
          status: { $in: ['sent', 'delivered'] }
        });

        if (unseenMessages.length > 0) {
          const msgIds = unseenMessages.map(m => m._id);
          await Message.updateMany(
            { _id: { $in: msgIds } },
            { $set: { status: 'seen' } }
          );

          const chat = await Chat.findById(chatId);
          if (chat) {
            chat.participants.forEach(pId => {
              io.to(pId.toString()).emit('message_status_update', {
                chatId,
                messageIds: msgIds,
                status: 'seen'
              });
            });
          }
        }
      } catch (err) {
        console.error('Error updating seen messages on join_chat:', err);
      }
    }
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room: ${chatId}`);
  });

  socket.on('send_message', async ({ chatId, senderId, content }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return socket.emit('error', { message: 'Chat not found.' });
      }

      // Calculate initial status
      let status = 'sent';
      const otherParticipants = chat.participants.filter(p => p.toString() !== senderId.toString());

      if (chat.type === 'private') {
        const recipientId = otherParticipants[0];
        if (recipientId) {
          const recipientStr = recipientId.toString();
          const onlineSockets = io.sockets.adapter.rooms.get(recipientStr);
          const isOnline = onlineSockets && onlineSockets.size > 0;
          if (isOnline) {
            const socketsInRoom = io.sockets.adapter.rooms.get(chatId);
            let isViewing = false;
            if (socketsInRoom) {
              for (const socketId of onlineSockets) {
                if (socketsInRoom.has(socketId)) {
                  isViewing = true;
                  break;
                }
              }
            }
            status = isViewing ? 'seen' : 'delivered';
          }
        }
      } else {
        // Group chat status logic
        const onlineOthers = otherParticipants.filter(p => {
          const sockets = io.sockets.adapter.rooms.get(p.toString());
          return sockets && sockets.size > 0;
        });

        if (onlineOthers.length === otherParticipants.length) {
          const socketsInRoom = io.sockets.adapter.rooms.get(chatId);
          const allInRoom = otherParticipants.every(p => {
            const userSockets = io.sockets.adapter.rooms.get(p.toString());
            if (!userSockets || !socketsInRoom) return false;
            for (const socketId of userSockets) {
              if (socketsInRoom.has(socketId)) return true;
            }
            return false;
          });
          status = allInRoom ? 'seen' : 'delivered';
        } else if (onlineOthers.length > 0) {
          status = 'delivered';
        } else {
          status = 'sent';
        }
      }

      const message = new Message({
        chatId,
        senderId,
        content,
        status
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username email avatar');

      // Emit the message to each participant's personal room (userId)
      chat.participants.forEach((pId) => {
        io.to(pId.toString()).emit('receive_message', populatedMessage);
      });

      console.log(`Message in chat ${chatId} broadcasted to all participants with status ${status}.`);
    } catch (err) {
      console.error('Socket send_message error:', err);
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  socket.on('group_add_member', async ({ chatId, userId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return socket.emit('error', { message: 'Chat not found.' });

      if (chat.groupAdmin.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: Only the group owner can add members.' });
      }

      if (chat.participants.includes(userId)) {
        return socket.emit('error', { message: 'User is already a participant.' });
      }

      chat.participants.push(userId);
      if (!chat.membersInfo || chat.membersInfo.length === 0) {
        chat.membersInfo = chat.participants.map(p => ({
          user: p,
          role: p.toString() === chat.groupAdmin.toString() ? 'owner' : 'member',
          joinedAt: new Date()
        }));
      }
      
      if (!chat.membersInfo.some(m => m.user.toString() === userId.toString())) {
        chat.membersInfo.push({
          user: userId,
          role: 'member',
          joinedAt: new Date()
        });
      }

      await chat.save();

      const updatedChat = await Chat.findById(chatId)
        .populate('participants', 'username email avatar')
        .populate('groupAdmin', 'username email avatar')
        .populate('membersInfo.user', 'username email avatar');

      const addedUser = updatedChat.participants.find(p => p._id.toString() === userId.toString());

      // Notify the added user directly
      io.to(userId).emit('member_added', {
        chatId,
        chat: updatedChat,
        addedUser,
        membersInfo: updatedChat.membersInfo
      });

      // Notify other participants
      updatedChat.participants.forEach(pId => {
        if (pId.toString() !== userId.toString()) {
          io.to(pId.toString()).emit('member_added', {
            chatId,
            chat: updatedChat,
            addedUser,
            membersInfo: updatedChat.membersInfo
          });
        }
      });
    } catch (err) {
      console.error('Socket group_add_member error:', err);
      socket.emit('error', { message: 'Failed to add member.' });
    }
  });

  socket.on('group_remove_member', async ({ chatId, memberId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return socket.emit('error', { message: 'Chat not found.' });

      if (chat.groupAdmin.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized: Only the group owner can remove members.' });
      }

      if (memberId.toString() === socket.userId) {
        return socket.emit('error', { message: 'Owners cannot remove themselves.' });
      }

      chat.participants = chat.participants.filter(p => p.toString() !== memberId.toString());
      if (chat.membersInfo) {
        chat.membersInfo = chat.membersInfo.filter(m => m.user.toString() !== memberId.toString());
      }

      await chat.save();

      const updatedChat = await Chat.findById(chatId)
        .populate('participants', 'username email avatar')
        .populate('groupAdmin', 'username email avatar')
        .populate('membersInfo.user', 'username email avatar');

      // Notify the removed user
      io.to(memberId).emit('member_removed', {
        chatId,
        removedUserId: memberId
      });

      // Evict socket from room
      const targetSocketId = onlineUsers.get(memberId.toString());
      if (targetSocketId) {
        const socketObj = io.sockets.sockets.get(targetSocketId);
        if (socketObj) {
          socketObj.leave(chatId);
        }
      }

      // Notify remaining members
      updatedChat.participants.forEach(pId => {
        io.to(pId.toString()).emit('member_removed', {
          chatId,
          removedUserId: memberId
        });
      });
    } catch (err) {
      console.error('Socket group_remove_member error:', err);
      socket.emit('error', { message: 'Failed to remove member.' });
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

    const disconnectedUserId = socket.userId;
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
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
