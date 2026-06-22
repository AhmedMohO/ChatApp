import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ChatController {
  public static getChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chats = await ChatService.fetchUserChats(currentUserId);
      return res.json({
        success: true,
        message: 'Chats retrieved successfully',
        data: chats
      });
    } catch (error) {
      next(error);
    }
  };

  public static createChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const { type, recipientId, groupName, participants } = req.body;
      const chat = await ChatService.createChat({ type, recipientId, groupName, participants }, currentUserId);

      return res.status(201).json({
        success: true,
        message: 'Chat created successfully',
        data: chat
      });
    } catch (error) {
      next(error);
    }
  };

  public static updateGroupInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chatId = req.params.chatId as string;
      const { groupName, groupDescription, groupAvatar } = req.body;

      const chat = await ChatService.updateGroupInfo(
        chatId,
        { groupName, groupDescription, groupAvatar },
        currentUserId,
        req.io
      );

      return res.json({
        success: true,
        message: 'Group info updated successfully',
        data: chat
      });
    } catch (error) {
      next(error);
    }
  };

  public static addMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chatId = req.params.chatId as string;
      const { userId } = req.body;

      const chat = await ChatService.addMember(chatId, userId, currentUserId, req.io);

      return res.json({
        success: true,
        message: 'Member added successfully',
        data: chat
      });
    } catch (error) {
      next(error);
    }
  };

  public static removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chatId = req.params.chatId as string;
      const memberId = req.params.memberId as string;

      const chat = await ChatService.removeMember(chatId, memberId, currentUserId, req.io, req.onlineUsers);

      return res.json({
        success: true,
        message: 'Member removed successfully',
        data: chat
      });
    } catch (error) {
      next(error);
    }
  };

  public static transferOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chatId = req.params.chatId as string;
      const { newOwnerId } = req.body;

      const chat = await ChatService.transferOwnership(chatId, newOwnerId, currentUserId, req.io);

      return res.json({
        success: true,
        message: 'Group ownership transferred successfully',
        data: chat
      });
    } catch (error) {
      next(error);
    }
  };
}
