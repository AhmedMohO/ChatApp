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

    return res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
