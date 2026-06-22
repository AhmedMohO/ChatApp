import { z } from 'zod';

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  })
});
