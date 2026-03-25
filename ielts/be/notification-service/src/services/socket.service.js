/**
 * socket.service.js
 * ────────────────────────────────────────────────
 * Initializes Socket.io on the HTTP server and manages
 * per-user rooms for real-time in-app notification delivery.
 */

const { Server } = require('socket.io');

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

  io.on('connection', (socket) => {
    // Client sends userId as a query param: io("url", { query: { userId } })
    const userId = socket.handshake.query.userId;

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`🔌 Socket connected: user:${userId} (${socket.id})`);
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
  io.to(`user:${userId}`).emit('notification', payload);
}

module.exports = { initSocketIO, getIO, emitToUser };
