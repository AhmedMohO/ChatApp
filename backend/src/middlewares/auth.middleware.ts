import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { AuthenticatedRequest } from '../types/index.js';

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. No token provided.', 401, 'AUTHENTICATION_REQUIRED'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new AppError('User not found or deleted.', 401, 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    next(new AppError('Invalid or expired token.', 401, 'INVALID_TOKEN'));
  }
};
