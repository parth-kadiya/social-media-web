// server/socket.js
module.exports = function initializeSocket(io, userSocketMap) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Support both query and auth (client may send via query or auth)
    const userId = (socket.handshake && (socket.handshake.query?.userId || socket.handshake.auth?.userId)) || null;
    if (userId) {
      // store multiple sockets per user (set of socket ids)
      if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
      userSocketMap[userId].add(socket.id);
      console.log(`Mapped user ${userId} -> socket ${socket.id}`);
    }

    // debug events
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'reason:', reason);
      // remove socket from all user entries (cleanup)
      for (const [uid, sockSet] of Object.entries(userSocketMap)) {
        if (sockSet && sockSet.has && sockSet.has(socket.id)) {
          sockSet.delete(socket.id);
          if (sockSet.size === 0) delete userSocketMap[uid];
          console.log(`Removed mapping for user ${uid} socket ${socket.id}`);
          break;
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect_error for', socket.id, err && err.message);
    });

    // optional: handle client->server real-time send (if you want to emit directly from client)
    socket.on('send-message', (payload) => {
      // payload: { to: '<userId>', message: { ... } }
      try {
        const to = payload.to;
        const message = payload.message;
        const targets = userSocketMap[to];
        if (targets) {
          for (const sid of Array.from(targets)) {
            io.to(sid).emit('receive-message', message);
          }
        }
      } catch (e) {
        console.error('send-message handler error', e);
      }
    });
  });
};
