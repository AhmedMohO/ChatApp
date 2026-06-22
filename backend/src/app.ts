import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { Server } from 'socket.io';
import { AuthenticatedRequest } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global Context for Socket.IO integration across MVC layers
export const socketContext = {
  io: undefined as Server | undefined,
  onlineUsers: undefined as Map<string, string> | undefined
};

// Security and utility Middlewares
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json({ limit: '50kb' }));

// Attach Socket.IO to Express request context
app.use((req: AuthenticatedRequest, res, next) => {
  req.io = socketContext.io;
  req.onlineUsers = socketContext.onlineUsers;
  next();
});

// Mount Rate Limiter on API routes
app.use('/api', apiRateLimiter);

// Mount main API routes
app.use('/api', apiRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Global centralized error handler
app.use(errorHandler);

export default app;
