import { z } from 'zod';

export const createChatSchema = z.object({
  body: z.object({
    type: z.enum(['private', 'group'], { required_error: 'Chat type is required' }),
    recipientId: z.string().optional(),
    groupName: z.string().optional(),
    participants: z.array(z.string()).optional()
  })
});

export const updateGroupSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  }),
  body: z.object({
    groupName: z.string().min(1, 'Group Name cannot be empty').optional(),
    groupDescription: z.string().optional(),
    groupAvatar: z.string().url('Avatar must be a valid URL').optional()
  })
});

export const addMemberSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  }),
  body: z.object({
    userId: z.string({ required_error: 'User ID is required to add a member' })
  })
});

export const removeMemberSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' }),
    memberId: z.string({ required_error: 'Member ID parameter is required' })
  })
});

export const transferOwnerSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  }),
  body: z.object({
    newOwnerId: z.string({ required_error: 'New owner ID is required to transfer group ownership' })
  })
});

export const deleteGroupSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  })
});

export const leaveGroupSchema = z.object({
  params: z.object({
    chatId: z.string({ required_error: 'Chat ID parameter is required' })
  })
});

