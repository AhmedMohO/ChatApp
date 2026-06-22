import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export class AuthService {
  public static generateToken(userId: string): string {
    return jwt.sign(
      { id: userId },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  public static async registerUser(data: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
  }): Promise<{ token: string; user: Partial<IUser> }> {
    const { username, email, password, avatar } = data;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new AppError('Username or email already exists.', 400, 'USER_EXISTS');
    }

    const finalAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

    const user = new User({
      username,
      email,
      password,
      avatar: finalAvatar
    });

    await user.save();
    const token = this.generateToken(user._id.toString());

    return {
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    };
  }

  public static async loginUser(data: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: Partial<IUser> }> {
    const { email, password } = data;

    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: email }]
    });

    if (!user) {
      throw new AppError('Invalid credentials.', 400, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials.', 400, 'INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user._id.toString());

    return {
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    };
  }

  public static async getUserProfile(userId: string): Promise<Partial<IUser>> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return user;
  }

  public static async getAllUsersExcept(userId: string): Promise<IUser[]> {
    return User.find({ _id: { $ne: userId } }).select('username email avatar');
  }
}
