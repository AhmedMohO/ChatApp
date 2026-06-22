import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string({ required_error: 'Username is required' })
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username cannot exceed 30 characters')
      .trim(),
    email: z.string({ required_error: 'Email is required' })
      .email('Invalid email address')
      .trim(),
    password: z.string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    avatar: z.string().url('Avatar must be a valid URL').optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email or Username is required' })
      .trim(),
    password: z.string({ required_error: 'Password is required' })
  })
});
