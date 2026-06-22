import { createServer } from 'http';
import { Server } from 'socket.io';
import app, { socketContext } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { initSockets, onlineUsers } from './sockets/index.js';

// 1. Establish database connection
await connectDB();

// 2. Initialize HTTP server
const httpServer = createServer(app);

// 3. Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 4. Bind socket context to Express request middleware
socketContext.io = io;
socketContext.onlineUsers = onlineUsers;

// 5. Initialize Sockets handlers
initSockets(io);

// 6. Listen on PORT
httpServer.listen(env.PORT, () => {
  console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});
