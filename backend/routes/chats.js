import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar')
      .populate('membersInfo.user', 'username email avatar');

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

      const membersInfo = uniqueParticipants.map((pId) => ({
        user: pId,
        role: pId.toString() === req.user._id.toString() ? 'owner' : 'member',
        joinedAt: new Date()
      }));

      const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

      let chat = new Chat({
        type: 'group',
        groupName,
        groupDescription: '',
        groupAvatar: defaultAvatar,
        participants: uniqueParticipants,
        groupAdmin: req.user._id,
        membersInfo
      });

      await chat.save();
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username email avatar')
        .populate('groupAdmin', 'username email avatar')
        .populate('membersInfo.user', 'username email avatar');

      return res.status(201).json(chat);
    } else {
      return res.status(400).json({ message: 'Invalid chat type.' });
    }
  } catch (error) {
    console.error('Create chat error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update group info (name, description, avatar)
router.put('/:chatId', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { groupName, groupDescription, groupAvatar } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'Only group chats can be updated.' });
    }

    // Verify requesting user is the groupAdmin (owner)
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group owner can update group info.' });
    }

    if (groupName !== undefined) chat.groupName = groupName;
    if (groupDescription !== undefined) chat.groupDescription = groupDescription;
    if (groupAvatar !== undefined) chat.groupAvatar = groupAvatar;

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar')
      .populate('membersInfo.user', 'username email avatar');

    // Notify all participants
    const io = req.io;
    if (io) {
      updatedChat.participants.forEach(pId => {
        io.to(pId.toString()).emit('group_updated', {
          chatId,
          groupName: updatedChat.groupName,
          groupDescription: updatedChat.groupDescription,
          groupAvatar: updatedChat.groupAvatar
        });
      });
    }

    return res.json(updatedChat);
  } catch (error) {
    console.error('Update group info error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a member to the group
router.post('/:chatId/members', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'Members can only be added to group chats.' });
    }

    // Verify requesting user is the groupAdmin (owner)
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group owner can add members.' });
    }

    // Check if user is already a participant
    if (chat.participants.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the group.' });
    }

    // Add to participants list
    chat.participants.push(userId);

    // Initialize or append to membersInfo
    if (!chat.membersInfo || chat.membersInfo.length === 0) {
      chat.membersInfo = chat.participants.map(p => ({
        user: p,
        role: p.toString() === chat.groupAdmin.toString() ? 'owner' : 'member',
        joinedAt: new Date()
      }));
    }
    
    // Ensure we don't have duplicate info
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

    // Notify all participants including the new user
    const io = req.io;
    if (io) {
      // First, notify the new user directly with the complete chat details
      io.to(userId).emit('member_added', {
        chatId,
        chat: updatedChat,
        addedUser,
        membersInfo: updatedChat.membersInfo
      });

      // Then notify other existing members of the new addition
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
    }

    return res.json(updatedChat);
  } catch (error) {
    console.error('Add group member error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a member from the group
router.delete('/:chatId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { chatId, memberId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'Members can only be removed from group chats.' });
    }

    // Verify requesting user is the groupAdmin (owner)
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group owner can remove members.' });
    }

    // Cannot remove oneself (the owner)
    if (memberId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Owners cannot remove themselves. Transfer ownership first.' });
    }

    // Remove from participants and membersInfo
    chat.participants = chat.participants.filter(p => p.toString() !== memberId.toString());
    if (chat.membersInfo) {
      chat.membersInfo = chat.membersInfo.filter(m => m.user.toString() !== memberId.toString());
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar')
      .populate('membersInfo.user', 'username email avatar');

    // Notify all participants and the removed user
    const io = req.io;
    if (io) {
      // Notify the removed user
      io.to(memberId).emit('member_removed', {
        chatId,
        removedUserId: memberId
      });

      // Evict the removed user's socket room connection
      const onlineUsers = req.onlineUsers || new Map();
      const removedUserSocketId = onlineUsers.get(memberId.toString());
      if (removedUserSocketId) {
        const socketObj = io.sockets.sockets.get(removedUserSocketId);
        if (socketObj) {
          socketObj.leave(chatId);
          console.log(`Socket ${removedUserSocketId} evicted from chat room: ${chatId}`);
        }
      }

      // Notify the remaining members
      updatedChat.participants.forEach(pId => {
        io.to(pId.toString()).emit('member_removed', {
          chatId,
          removedUserId: memberId
        });
      });
    }

    return res.json(updatedChat);
  } catch (error) {
    console.error('Remove group member error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Transfer ownership of the group
router.put('/:chatId/transfer-owner', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ message: 'New owner ID is required.' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    if (chat.type !== 'group') {
      return res.status(400).json({ message: 'Ownership can only be transferred in group chats.' });
    }

    // Verify requesting user is the groupAdmin (owner)
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the current group owner can transfer ownership.' });
    }

    // Check if newOwnerId is a participant
    if (!chat.participants.includes(newOwnerId)) {
      return res.status(400).json({ message: 'New owner must be a participant of the group.' });
    }

    // Set new groupAdmin
    chat.groupAdmin = newOwnerId;

    // Update roles in membersInfo
    if (!chat.membersInfo || chat.membersInfo.length === 0) {
      chat.membersInfo = chat.participants.map(p => ({
        user: p,
        role: p.toString() === newOwnerId.toString() ? 'owner' : 'member',
        joinedAt: new Date()
      }));
    } else {
      chat.membersInfo.forEach(member => {
        if (member.user.toString() === req.user._id.toString()) {
          member.role = 'member';
        } else if (member.user.toString() === newOwnerId.toString()) {
          member.role = 'owner';
        }
      });
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar')
      .populate('membersInfo.user', 'username email avatar');

    // Notify all participants
    const io = req.io;
    if (io) {
      updatedChat.participants.forEach(pId => {
        io.to(pId.toString()).emit('group_updated', {
          chatId,
          groupName: updatedChat.groupName,
          groupDescription: updatedChat.groupDescription,
          groupAvatar: updatedChat.groupAvatar,
          groupAdmin: updatedChat.groupAdmin,
          membersInfo: updatedChat.membersInfo
        });
      });
    }

    return res.json(updatedChat);
  } catch (error) {
    console.error('Transfer group ownership error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
