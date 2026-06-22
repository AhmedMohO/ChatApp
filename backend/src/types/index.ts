import { Request } from 'express';
import { Server } from 'socket.io';
import { IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  io?: Server;
  onlineUsers?: Map<string, string>;
}
