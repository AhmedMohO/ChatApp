import Message, { IMessage } from '../models/Message.js';
import Chat from '../models/Chat.js';
import { AppError } from '../utils/AppError.js';
import { Server } from 'socket.io';

export class MessageService {
  public static async fetchChatMessages(chatId: string, userId: string, io?: Server): Promise<IMessage[]> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');

    const userIdStr = userId.toString();
    if (!chat.participants.some(p => p.toString() === userIdStr)) {
      throw new AppError('You are not a participant in this chat.', 403, 'FORBIDDEN');
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username email avatar');

    // Mark unseen messages in this chat sent by others as 'seen'
    const unseenMessages = await Message.find({
      chatId,
      senderId: { $ne: userId as any },
      status: { $in: ['sent', 'delivered'] }
    });

    if (unseenMessages.length > 0) {
      const msgIds = unseenMessages.map(m => m._id);
      await Message.updateMany(
        { _id: { $in: msgIds } },
        { $set: { status: 'seen' } }
      );

      if (io) {
        chat.participants.forEach(pId => {
          io.to(pId.toString()).emit('message_status_update', {
            chatId,
            messageIds: msgIds,
            status: 'seen'
          });
        });
      }

      // Update local array before returning
      messages.forEach(msg => {
        if (msgIds.some(id => id.equals(msg._id))) {
          msg.status = 'seen';
        }
      });
    }

    return messages;
  }

  public static async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    io?: Server,
    onlineUsers?: Map<string, string>
  ): Promise<IMessage> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');

    // Calculate initial status
    let status: 'sent' | 'delivered' | 'seen' = 'sent';
    const senderIdStr = senderId.toString();
    const otherParticipants = chat.participants.filter(p => p.toString() !== senderIdStr);

    if (io) {
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

    if (!populatedMessage) throw new AppError('Message could not be saved.', 500, 'SAVE_FAILED');

    if (io) {
      chat.participants.forEach((pId) => {
        io.to(pId.toString()).emit('receive_message', populatedMessage);
      });
    }

    return populatedMessage;
  }

  public static async deliverOfflineMessages(userId: string, io: Server): Promise<void> {
    const userChats = await Chat.find({ participants: userId });
    const chatIds = userChats.map(c => c._id);

    const sentMessages = await Message.find({
      chatId: { $in: chatIds },
      senderId: { $ne: userId as any },
      status: 'sent'
    });

    if (sentMessages.length > 0) {
      const msgIds = sentMessages.map(m => m._id);
      await Message.updateMany(
        { _id: { $in: msgIds } },
        { $set: { status: 'delivered' } }
      );

      const chatUpdates: Record<string, string[]> = {};
      sentMessages.forEach(msg => {
        const cId = msg.chatId.toString();
        if (!chatUpdates[cId]) {
          chatUpdates[cId] = [];
        }
        chatUpdates[cId].push(msg._id.toString());
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
  }
}
