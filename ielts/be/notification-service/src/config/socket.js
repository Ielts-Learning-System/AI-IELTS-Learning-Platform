const { Server } = require('socket.io');

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

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`🔌 Socket connected: user:${userId} (${socket.id})`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initSocketIO };
