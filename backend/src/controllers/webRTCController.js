const handleWebRTCSignaling = (io, socket) => {
  const { userId, userName } = socket;

  // Handle call initiation
  socket.on('webrtc:initiate-call', async (data) => {
    const { targetUserId, isGroup } = data;
    const targetSocket = await io.fetchSocket(targetUserId);

    if (targetSocket) {
      targetSocket.emit('webrtc:incoming-call', {
        callerId: userId,
        callerName: userName,
        isGroup,
      });
    }
  });

  // Handle call acceptance
  socket.on('webrtc:accept-call', async (data) => {
    const { callerId } = data;
    const callerSocket = await io.fetchSocket(callerId);

    if (callerSocket) {
      callerSocket.emit('webrtc:call-accepted', {
        userId,
        userName,
      });
    }
  });

  // Handle call rejection
  socket.on('webrtc:reject-call', async (data) => {
    const { callerId } = data;
    const callerSocket = await io.fetchSocket(callerId);

    if (callerSocket) {
      callerSocket.emit('webrtc:call-rejected', {
        userId,
        userName,
      });
    }
  });

  // Handle WebRTC offer
  socket.on('webrtc:offer', async (data) => {
    const { offer, targetUserId } = data;
    const targetSocket = await io.fetchSocket(targetUserId);

    if (targetSocket) {
      targetSocket.emit('webrtc:offer', {
        offer,
        callerId: userId,
      });
    }
  });

  // Handle WebRTC answer
  socket.on('webrtc:answer', async (data) => {
    const { answer, targetUserId } = data;
    const targetSocket = await io.fetchSocket(targetUserId);

    if (targetSocket) {
      targetSocket.emit('webrtc:answer', {
        answer,
        callerId: userId,
      });
    }
  });

  // Handle ICE candidates
  socket.on('webrtc:ice-candidate', async (data) => {
    const { candidate, targetUserId } = data;
    const targetSocket = await io.fetchSocket(targetUserId);

    if (targetSocket) {
      targetSocket.emit('webrtc:ice-candidate', {
        candidate,
        callerId: userId,
      });
    }
  });

  // Handle adding participant to group call
  socket.on('webrtc:add-participant', async (data) => {
    const { targetUserId } = data;
    const targetSocket = await io.fetchSocket(targetUserId);

    if (targetSocket) {
      targetSocket.emit('webrtc:incoming-call', {
        callerId: userId,
        callerName: userName,
        isGroup: true,
      });
    }
  });

  // Handle call end
  socket.on('webrtc:end-call', async () => {
    // Notify all participants in the room that the call has ended
    socket.broadcast.to(socket.room).emit('webrtc:call-ended', {
      userId,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Notify others that the participant has left
    socket.broadcast.to(socket.room).emit('webrtc:participant-left', {
      userId,
    });
  });
};

export default handleWebRTCSignaling; 