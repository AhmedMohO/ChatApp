import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar');

    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'username avatar');
        return {
          ...chat.toObject(),
          lastMessage
        };
      })
    );

    chatsWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
      return timeB - timeA;
    });

    return res.json(chatsWithLastMessage);
  } catch (error) {
    console.error('Fetch chats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, recipientId, groupName, participants } = req.body;

    if (type === 'private') {
      if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required for private chats.' });
      }

      let chat = await Chat.findOne({
        type: 'private',
        participants: { $all: [req.user._id, recipientId], $size: 2 }
      }).populate('participants', 'username email avatar');

      if (chat) {
        return res.json(chat);
      }

      chat = new Chat({
        type: 'private',
        participants: [req.user._id, recipientId]
      });

      await chat.save();
      chat = await Chat.findById(chat._id).populate('participants', 'username email avatar');
      return res.status(201).json(chat);

    } else if (type === 'group') {
      if (!groupName || !participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ message: 'Group name and participants list are required.' });
      }

      const cleanParticipants = participants.filter(Boolean);
      const uniqueParticipants = Array.from(new Set([...cleanParticipants, req.user._id.toString()]));

      let chat = new Chat({
        type: 'group',
        groupName,
        participants: uniqueParticipants,
        groupAdmin: req.user._id
      });

      await chat.save();
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username email avatar')
        .populate('groupAdmin', 'username email avatar');

      return res.status(201).json(chat);
    } else {
      return res.status(400).json({ message: 'Invalid chat type.' });
    }
  } catch (error) {
    console.error('Create chat error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
