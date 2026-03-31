/**
 * socket.service.js
 * ────────────────────────────────────────────────
 * Initializes Socket.io on the HTTP server and manages
 * per-user rooms for real-time in-app notification delivery.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Attach Socket.io to an existing HTTP server.
 * Each authenticated client joins a private room `user:<userId>`.
 *
 * @param {http.Server} httpServer – Node HTTP server instance
 * @returns {Server} Socket.io server instance
 */
function initSocketIO(httpServer) {
  io = new Server(httpServer, {
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

  console.log('🔌 Socket.io initialized');
  return io;
}

/**
 * Return the current Socket.io instance (null if not yet initialized).
 */
function getIO() {
  return io;
}

/**
 * Emit a real-time notification to a specific user's room.
 *
 * @param {string} userId  – Target user
 * @param {Object} payload – Notification data sent to the client
 */
function emitToUser(userId, payload) {
  if (!io) return;
  io.to(String(userId)).emit('new_notification', payload);
}

module.exports = { initSocketIO, getIO, emitToUser };
