const handleWebRTCSignaling = (io, socket) => {
  const { userId, userName } = socket;

  // Handle call initiation
  socket.on('webrtc:initiate-call', async (data) => {
    try {
      const { targetUserId, isGroup, callType } = data;
      const targetSocket = await io.fetchSocket(targetUserId);

      if (targetSocket) {
        targetSocket.emit('webrtc:incoming-call', {
          callerId: userId,
          callerName: userName,
          isGroup,
          callType
        });
      } else {
        socket.emit('webrtc:error', {
          code: 'USER_OFFLINE',
          message: 'Target user is offline'
        });
      }
    } catch (error) {
      console.error('Error in call initiation:', error);
      socket.emit('webrtc:error', {
        code: 'INITIATION_FAILED',
        message: 'Failed to initiate call'
      });
    }
  });

  // Handle call acceptance
  socket.on('webrtc:accept-call', async (data) => {
    try {
      const { callerId } = data;
      const callerSocket = await io.fetchSocket(callerId);

      if (callerSocket) {
        callerSocket.emit('webrtc:call-accepted', {
          userId,
          userName
        });
      } else {
        socket.emit('webrtc:error', {
          code: 'CALLER_DISCONNECTED',
          message: 'Caller is no longer connected'
        });
      }
    } catch (error) {
      console.error('Error in call acceptance:', error);
      socket.emit('webrtc:error', {
        code: 'ACCEPTANCE_FAILED',
        message: 'Failed to accept call'
      });
    }
  });

  // Handle call rejection
  socket.on('webrtc:reject-call', async (data) => {
    try {
      const { callerId } = data;
      const callerSocket = await io.fetchSocket(callerId);

      if (callerSocket) {
        callerSocket.emit('webrtc:call-rejected', {
          userId,
          userName,
          reason: data.reason || 'Call rejected by user'
        });
      }
    } catch (error) {
      console.error('Error in call rejection:', error);
    }
  });

  // Handle WebRTC offer
  socket.on('webrtc:offer', async (data) => {
    try {
      const { offer, targetUserId } = data;
      console.log(`Received offer from ${userId} to ${targetUserId}`);
      
      const targetSocket = await io.fetchSocket(targetUserId);
      if (targetSocket) {
        console.log('Forwarding offer to target user');
        targetSocket.emit('webrtc:offer', {
          offer,
          callerId: userId,
          callerName: userName
        });
      } else {
        console.log('Target user not found or offline');
        socket.emit('webrtc:error', {
          code: 'TARGET_OFFLINE',
          message: 'Target user is offline'
        });
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      socket.emit('webrtc:error', {
        code: 'OFFER_FAILED',
        message: 'Failed to process offer'
      });
    }
  });

  // Handle WebRTC answer
  socket.on('webrtc:answer', async (data) => {
    try {
      const { answer, targetUserId } = data;
      console.log(`Received answer from ${userId} to ${targetUserId}`);
      
      const targetSocket = await io.fetchSocket(targetUserId);
      if (targetSocket) {
        console.log('Forwarding answer to caller');
        targetSocket.emit('webrtc:answer', {
          answer,
          callerId: userId
        });
      } else {
        socket.emit('webrtc:error', {
          code: 'CALLER_OFFLINE',
          message: 'Caller is no longer connected'
        });
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      socket.emit('webrtc:error', {
        code: 'ANSWER_FAILED',
        message: 'Failed to process answer'
      });
    }
  });

  // Handle ICE candidates
  socket.on('webrtc:ice-candidate', async (data) => {
    try {
      const { candidate, targetUserId } = data;
      console.log(`Received ICE candidate from ${userId} to ${targetUserId}`);
      
      const targetSocket = await io.fetchSocket(targetUserId);
      if (targetSocket) {
        console.log('Forwarding ICE candidate');
        targetSocket.emit('webrtc:ice-candidate', {
          candidate,
          callerId: userId
        });
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });

  // Handle connection failures
  socket.on('webrtc:connection-failed', async (data) => {
    try {
      const { targetUserId } = data;
      const targetSocket = await io.fetchSocket(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('webrtc:connection-failed', {
          userId,
          reason: 'Peer connection failed'
        });
      }
    } catch (error) {
      console.error('Error handling connection failure:', error);
    }
  });

  // Handle call end
  socket.on('webrtc:end-call', async (data) => {
    try {
      const { targetUserId } = data;
      console.log(`Call ended by ${userId} with ${targetUserId}`);
      
      const targetSocket = await io.fetchSocket(targetUserId);
      if (targetSocket) {
        targetSocket.emit('webrtc:call-ended', {
          userId,
          reason: data.reason || 'Call ended by other participant'
        });
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
    // Notify any active call participants
    socket.broadcast.emit('webrtc:peer-disconnected', {
      userId,
      reason: 'Peer disconnected unexpectedly'
    });
  });
};

export default handleWebRTCSignaling; 