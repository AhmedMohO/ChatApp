import Chat, { IChat } from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { Server } from 'socket.io';

export class ChatService {
  private static populateChat(query: any) {
    return query
      .populate('participants', 'username email avatar')
      .populate('groupAdmin', 'username email avatar')
      .populate('membersInfo.user', 'username email avatar');
  }

  public static async fetchUserChats(userId: string): Promise<any[]> {
    const chats = await this.populateChat(Chat.find({ participants: userId }));

    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat: any) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'username avatar');
        return {
          ...chat.toObject(),
          lastMessage
        };
      })
    );

    return chatsWithLastMessage.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
      return timeB.getTime() - timeA.getTime();
    });
  }

  public static async createChat(
    data: {
      type: 'private' | 'group';
      recipientId?: string;
      groupName?: string;
      participants?: string[];
    },
    creatorId: string
  ): Promise<IChat> {
    const { type, recipientId, groupName, participants } = data;

    if (type === 'private') {
      if (!recipientId) {
        throw new AppError('Recipient ID is required for private chats.', 400, 'RECIPIENT_REQUIRED');
      }

      let chat = await Chat.findOne({
        type: 'private',
        participants: { $all: [creatorId, recipientId], $size: 2 }
      });

      if (chat) {
        return this.populateChat(Chat.findById(chat._id));
      }

      chat = new Chat({
        type: 'private',
        participants: [creatorId, recipientId]
      });

      await chat.save();
      return this.populateChat(Chat.findById(chat._id));

    } else {
      if (!groupName || !participants || !Array.isArray(participants) || participants.length === 0) {
        throw new AppError('Group name and participants list are required.', 400, 'INVALID_GROUP_PARAMETERS');
      }

      const cleanParticipants = participants.filter(Boolean);
      const uniqueParticipants = Array.from(new Set([...cleanParticipants, creatorId]));

      const membersInfo = uniqueParticipants.map((pId) => ({
        user: pId,
        role: pId === creatorId ? 'owner' : 'member',
        joinedAt: new Date()
      }));

      const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

      let chat = new Chat({
        type: 'group',
        groupName,
        groupDescription: '',
        groupAvatar: defaultAvatar,
        participants: uniqueParticipants,
        groupAdmin: creatorId,
        membersInfo
      });

      await chat.save();
      return this.populateChat(Chat.findById(chat._id));
    }
  }

  public static async updateGroupInfo(
    chatId: string,
    groupData: { groupName?: string; groupDescription?: string; groupAvatar?: string },
    userId: string,
    io?: Server
  ): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Only group chats can be updated.', 400, 'NOT_A_GROUP');

    if (chat.groupAdmin?.toString() !== userId) {
      throw new AppError('Only the group owner can update group info.', 403, 'UNAUTHORIZED');
    }

    if (groupData.groupName !== undefined) chat.groupName = groupData.groupName;
    if (groupData.groupDescription !== undefined) chat.groupDescription = groupData.groupDescription;
    if (groupData.groupAvatar !== undefined) chat.groupAvatar = groupData.groupAvatar;

    await chat.save();

    const updatedChat = await this.populateChat(Chat.findById(chatId));

    if (io) {
      updatedChat.participants.forEach((pId: any) => {
        io.to(pId.toString()).emit('group_updated', {
          chatId,
          groupName: updatedChat.groupName,
          groupDescription: updatedChat.groupDescription,
          groupAvatar: updatedChat.groupAvatar
        });
      });
    }

    return updatedChat;
  }

  public static async addMember(
    chatId: string,
    targetUserId: string,
    actionUserId: string,
    io?: Server
  ): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Members can only be added to group chats.', 400, 'NOT_A_GROUP');

    if (chat.groupAdmin?.toString() !== actionUserId) {
      throw new AppError('Only the group owner can add members.', 403, 'UNAUTHORIZED');
    }

    const userIdStr = targetUserId.toString();
    if (chat.participants.some(p => p.toString() === userIdStr)) {
      throw new AppError('User is already in the group.', 400, 'MEMBER_EXISTS');
    }

    chat.participants.push(targetUserId as any);

    if (!chat.membersInfo || chat.membersInfo.length === 0) {
      chat.membersInfo = chat.participants.map(p => ({
        user: p,
        role: p.toString() === chat.groupAdmin?.toString() ? 'owner' : 'member',
        joinedAt: new Date()
      }));
    }

    if (!chat.membersInfo.some(m => m.user.toString() === userIdStr)) {
      chat.membersInfo.push({
        user: targetUserId as any,
        role: 'member',
        joinedAt: new Date()
      });
    }

    await chat.save();

    const updatedChat = await this.populateChat(Chat.findById(chatId));
    const addedUser = updatedChat.participants.find((p: any) => p._id.toString() === userIdStr);

    if (io) {
      // Notify added user directly
      io.to(userIdStr).emit('member_added', {
        chatId,
        chat: updatedChat,
        addedUser,
        membersInfo: updatedChat.membersInfo
      });

      // Notify others
      updatedChat.participants.forEach((pId: any) => {
        if (pId.toString() !== userIdStr) {
          io.to(pId.toString()).emit('member_added', {
            chatId,
            chat: updatedChat,
            addedUser,
            membersInfo: updatedChat.membersInfo
          });
        }
      });
    }

    return updatedChat;
  }

  public static async removeMember(
    chatId: string,
    memberId: string,
    actionUserId: string,
    io?: Server,
    onlineUsers?: Map<string, string>
  ): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Members can only be removed from group chats.', 400, 'NOT_A_GROUP');

    if (chat.groupAdmin?.toString() !== actionUserId) {
      throw new AppError('Only the group owner can remove members.', 403, 'UNAUTHORIZED');
    }

    const memberIdStr = memberId.toString();
    if (memberIdStr === actionUserId) {
      throw new AppError('Owners cannot remove themselves. Transfer ownership first.', 400, 'CANNOT_REMOVE_SELF');
    }

    chat.participants = chat.participants.filter(p => p.toString() !== memberIdStr);
    if (chat.membersInfo) {
      chat.membersInfo = chat.membersInfo.filter(m => m.user.toString() !== memberIdStr);
    }

    await chat.save();

    const updatedChat = await this.populateChat(Chat.findById(chatId));

    if (io) {
      // Notify the removed user
      io.to(memberIdStr).emit('member_removed', {
        chatId,
        removedUserId: memberIdStr
      });

      // Evict user's socket from room
      if (onlineUsers) {
        const socketId = onlineUsers.get(memberIdStr);
        if (socketId) {
          const socketObj = io.sockets.sockets.get(socketId);
          if (socketObj) {
            socketObj.leave(chatId);
            console.log(`Socket ${socketId} evicted from chat room ${chatId}`);
          }
        }
      }

      // Notify others
      updatedChat.participants.forEach((pId: any) => {
        io.to(pId.toString()).emit('member_removed', {
          chatId,
          removedUserId: memberIdStr
        });
      });
    }

    return updatedChat;
  }

  public static async transferOwnership(
    chatId: string,
    newOwnerId: string,
    actionUserId: string,
    io?: Server
  ): Promise<IChat> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Ownership can only be transferred in group chats.', 400, 'NOT_A_GROUP');

    if (chat.groupAdmin?.toString() !== actionUserId) {
      throw new AppError('Only the current group owner can transfer ownership.', 403, 'UNAUTHORIZED');
    }

    const newOwnerIdStr = newOwnerId.toString();
    if (!chat.participants.some(p => p.toString() === newOwnerIdStr)) {
      throw new AppError('New owner must be a participant of the group.', 400, 'NEW_OWNER_NOT_PARTICIPANT');
    }

    chat.groupAdmin = newOwnerId as any;

    if (!chat.membersInfo || chat.membersInfo.length === 0) {
      chat.membersInfo = chat.participants.map(p => ({
        user: p,
        role: p.toString() === newOwnerIdStr ? 'owner' : 'member',
        joinedAt: new Date()
      }));
    } else {
      chat.membersInfo.forEach(member => {
        if (member.user.toString() === actionUserId) {
          member.role = 'member';
        } else if (member.user.toString() === newOwnerIdStr) {
          member.role = 'owner';
        }
      });
    }

    await chat.save();

    const updatedChat = await this.populateChat(Chat.findById(chatId));

    if (io) {
      updatedChat.participants.forEach((pId: any) => {
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

    return updatedChat;
  }

  public static async deleteGroup(
    chatId: string,
    actionUserId: string,
    io?: Server
  ): Promise<void> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Only group chats can be deleted.', 400, 'NOT_A_GROUP');

    if (chat.groupAdmin?.toString() !== actionUserId) {
      throw new AppError('Only the group owner can delete the group.', 403, 'UNAUTHORIZED');
    }

    // Capture participants list before deletion for socket notifications
    const participants = [...chat.participants];

    // Delete all messages in the group
    await Message.deleteMany({ chatId });

    // Delete the group chat document
    await Chat.findByIdAndDelete(chatId);

    // Notify all participants of the group deletion
    if (io) {
      participants.forEach((pId: any) => {
        io.to(pId.toString()).emit('group_deleted', {
          chatId
        });
      });
    }
  }

  public static async leaveGroup(
    chatId: string,
    userId: string,
    io?: Server,
    onlineUsers?: Map<string, string>
  ): Promise<any> {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
    if (chat.type !== 'group') throw new AppError('Only group chats can be left.', 400, 'NOT_A_GROUP');

    const userIdStr = userId.toString();
    if (!chat.participants.some(p => p.toString() === userIdStr)) {
      throw new AppError('You are not a member of this group.', 400, 'NOT_A_MEMBER');
    }

    const isOwner = chat.groupAdmin?.toString() === userIdStr;

    if (isOwner) {
      // If the owner is the last participant, leaving is equivalent to deleting the group
      if (chat.participants.length === 1) {
        await this.deleteGroup(chatId, userId, io);
        return { deleted: true };
      } else {
        // If there are other participants, owner must transfer ownership first
        throw new AppError(
          'You are the owner. Please transfer ownership or delete the group.',
          400,
          'OWNER_MUST_TRANSFER_OWNERSHIP'
        );
      }
    }

    // Remove member from participants list
    chat.participants = chat.participants.filter(p => p.toString() !== userIdStr);
    
    // Remove member from membersInfo list
    if (chat.membersInfo) {
      chat.membersInfo = chat.membersInfo.filter(m => m.user.toString() !== userIdStr);
    }

    await chat.save();

    const updatedChat = await this.populateChat(Chat.findById(chatId));

    if (io) {
      // Notify the leaving user (in case they have other tabs/connections open)
      io.to(userIdStr).emit('member_removed', {
        chatId,
        removedUserId: userIdStr
      });

      // Evict leaving user's socket from room
      if (onlineUsers) {
        const socketId = onlineUsers.get(userIdStr);
        if (socketId) {
          const socketObj = io.sockets.sockets.get(socketId);
          if (socketObj) {
            socketObj.leave(chatId);
            console.log(`Socket ${socketId} evicted from chat room ${chatId} (user left group)`);
          }
        }
      }

      // Notify remaining members
      updatedChat.participants.forEach((pId: any) => {
        io.to(pId.toString()).emit('member_removed', {
          chatId,
          removedUserId: userIdStr
        });
      });
    }

    return updatedChat;
  }
}
