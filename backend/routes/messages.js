import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a participant in this chat.' });
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username email avatar');

    // Mark unseen messages in this chat sent by others as 'seen'
    const unseenMessages = await Message.find({
      chatId,
      senderId: { $ne: req.user._id },
      status: { $in: ['sent', 'delivered'] }
    });

    if (unseenMessages.length > 0) {
      const msgIds = unseenMessages.map(m => m._id);
      await Message.updateMany(
        { _id: { $in: msgIds } },
        { $set: { status: 'seen' } }
      );

      // Emit status update to all participants via Socket.IO
      const io = req.io;
      if (io) {
        chat.participants.forEach(pId => {
          io.to(pId.toString()).emit('message_status_update', {
            chatId,
            messageIds: msgIds,
            status: 'seen'
          });
        });
      }

      // Update the returned messages statuses in memory
      messages.forEach(msg => {
        if (msgIds.some(id => id.equals(msg._id))) {
          msg.status = 'seen';
        }
      });
    }

    return res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
