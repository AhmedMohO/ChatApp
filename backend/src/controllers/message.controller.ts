import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class MessageController {
  public static getMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');

      const chatId = req.params.chatId as string;

      const messages = await MessageService.fetchChatMessages(chatId, currentUserId, req.io);

      return res.json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages
      });
    } catch (error) {
      next(error);
    }
  };
}
