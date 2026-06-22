import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AuthController {
  public static register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, avatar } = req.body;
      const result = await AuthService.registerUser({ username, email, password, avatar });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public static login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser({ email, password });

      return res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public static me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      return res.json({
        success: true,
        message: 'Current user retrieved successfully',
        data: {
          user: {
            id: req.user?._id,
            username: req.user?.username,
            email: req.user?.email,
            avatar: req.user?.avatar
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public static users = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) throw new Error('Unauthorized');
      
      const users = await AuthService.getAllUsersExcept(currentUserId);
      return res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error) {
      next(error);
    }
  };
}
