class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.onTrackCallbacks = new Map(); // userId -> callback
    
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    // Bind socket event handlers
    this.socket.on('webrtc:offer', this.handleOffer.bind(this));
    this.socket.on('webrtc:answer', this.handleAnswer.bind(this));
    this.socket.on('webrtc:ice-candidate', this.handleIceCandidate.bind(this));
    this.socket.on('webrtc:call-ended', this.handleCallEnded.bind(this));
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createPeerConnection(userId) {
    try {
      const peerConnection = new RTCPeerConnection(this.configuration);
      
      // Add local tracks to the peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('webrtc:ice-candidate', {
            candidate: event.candidate,
            targetUserId: userId,
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
      };

      // Handle receiving remote tracks
      peerConnection.ontrack = (event) => {
        const callback = this.onTrackCallbacks.get(userId);
        if (callback) {
          callback(event.streams[0]);
        }
      };

      this.peerConnections.set(userId, peerConnection);
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }

  async initiateCall(targetUserId) {
    try {
      const peerConnection = await this.createPeerConnection(targetUserId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc:offer', {
        offer,
        targetUserId,
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  async handleOffer(data) {
    try {
      const { offer, callerId } = data;
      const peerConnection = await this.createPeerConnection(callerId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc:answer', {
        answer,
        targetUserId: callerId,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(data) {
    try {
      const { answer, callerId } = data;
      const peerConnection = this.peerConnections.get(callerId);
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(data) {
    try {
      const { candidate, callerId } = data;
      const peerConnection = this.peerConnections.get(callerId);
      
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  handleCallEnded(data) {
    const { userId } = data;
    const peerConnection = this.peerConnections.get(userId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  setOnTrackCallback(userId, callback) {
    this.onTrackCallbacks.set(userId, callback);
  }

  endCall(userId) {
    const peerConnection = this.peerConnections.get(userId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
      this.socket.emit('webrtc:call-ended', { targetUserId: userId });
    }
  }

  endAllCalls() {
    this.peerConnections.forEach((connection, userId) => {
      connection.close();
      this.socket.emit('webrtc:call-ended', { targetUserId: userId });
    });
    this.peerConnections.clear();
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}

export default WebRTCService; 