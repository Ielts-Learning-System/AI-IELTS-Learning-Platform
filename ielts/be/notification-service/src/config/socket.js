const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Initialize Socket.io on the given HTTP server.
 * Users join a room named `user:<userId>` upon connection.
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null;
      const queryToken = socket.handshake.query?.token;
      const token = authToken || headerToken || queryToken;

      if (!token) {
        return next(new Error('Unauthorized: missing token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId;

      if (!userId) {
        return next(new Error('Unauthorized: invalid token payload'));
      }

      socket.userId = String(userId);
      return next();
    } catch (err) {
      return next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    if (userId) {
      socket.join(userId);
      console.log(`🔌 Socket connected: ${userId} (${socket.id})`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initSocketIO };
