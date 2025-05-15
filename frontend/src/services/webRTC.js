class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.onTrackCallbacks = new Map(); // userId -> callback
    this.onConnectionStateChange = null;
    
    this.configuration = {
      iceServers: [
        { 
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302'
          ]
        },
        {
          urls: ['turn:numb.viagenie.ca'],
          username: 'webrtc@live.com',
          credential: 'muazkh',
          credentialType: 'password'
        },
        {
          urls: ['turn:relay.metered.ca:80'],
          username: 'your_username',  // Replace with your actual credentials
          credential: 'your_credential'
        },
        {
          urls: ['turn:relay.metered.ca:443'],
          username: 'your_username',  // Replace with your actual credentials
          credential: 'your_credential'
        }
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    // Bind socket event handlers
    this.socket.on('webrtc:offer', this.handleOffer.bind(this));
    this.socket.on('webrtc:answer', this.handleAnswer.bind(this));
    this.socket.on('webrtc:ice-candidate', this.handleIceCandidate.bind(this));
    this.socket.on('webrtc:call-ended', this.handleCallEnded.bind(this));
    this.socket.on('webrtc:error', this.handleError.bind(this));
  }

  async startLocalStream(callType = 'video') {
    try {
      console.log('Starting local stream for call type:', callType);
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      console.log('Local stream started successfully');
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createPeerConnection(userId) {
    try {
      console.log('Creating peer connection for user:', userId);
      const peerConnection = new RTCPeerConnection(this.configuration);
      
      // Add local tracks to the peer connection
      if (this.localStream) {
        console.log('Adding local tracks to peer connection');
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
          this.socket.emit('webrtc:ice-candidate', {
            candidate: event.candidate,
            targetUserId: userId,
          });
        } else {
          console.log('ICE candidate gathering completed');
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
          console.log('ICE connection failed, attempting restart');
          peerConnection.restartIce();
        }
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(userId, peerConnection.iceConnectionState);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        switch(peerConnection.connectionState) {
          case 'failed':
            console.log('Connection failed, cleaning up');
            this.handleConnectionFailure(userId);
            break;
          case 'disconnected':
            console.log('Connection disconnected, attempting reconnection');
            this.handleDisconnection(userId);
            break;
          case 'closed':
            console.log('Connection closed, cleaning up');
            this.cleanupPeerConnection(userId);
            break;
        }
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(userId, peerConnection.connectionState);
        }
      };

      // Handle negotiation needed
      peerConnection.onnegotiationneeded = async () => {
        try {
          console.log('Negotiation needed for peer connection');
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          this.socket.emit('webrtc:offer', {
            offer,
            targetUserId: userId,
          });
        } catch (error) {
          console.error('Error during negotiation:', error);
        }
      };

      // Handle receiving remote tracks
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
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
      console.log('Initiating call to user:', targetUserId);
      const peerConnection = await this.createPeerConnection(targetUserId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);

      console.log('Sending offer to remote peer');
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
      console.log('Received offer from:', callerId);
      
      const peerConnection = await this.createPeerConnection(callerId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Creating answer');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('Sending answer to caller');
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
      console.log('Received answer from:', callerId);
      
      const peerConnection = this.peerConnections.get(callerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set successfully');
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(data) {
    try {
      const { candidate, callerId } = data;
      console.log('Received ICE candidate from:', callerId);
      
      const peerConnection = this.peerConnections.get(callerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added successfully');
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  handleCallEnded(data) {
    const { userId } = data;
    console.log('Call ended with user:', userId);
    
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  setOnTrackCallback(userId, callback) {
    this.onTrackCallbacks.set(userId, callback);
  }

  setOnConnectionStateChange(callback) {
    this.onConnectionStateChange = callback;
  }

  endCall(userId) {
    console.log('Ending call with user:', userId);
    const peerConnection = this.peerConnections.get(userId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
      this.socket.emit('webrtc:end-call', { targetUserId: userId });
    }
  }

  endAllCalls() {
    console.log('Ending all calls');
    this.peerConnections.forEach((connection, userId) => {
      connection.close();
      this.socket.emit('webrtc:end-call', { targetUserId: userId });
    });
    this.peerConnections.clear();
  }

  stopLocalStream() {
    if (this.localStream) {
      console.log('Stopping local stream');
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      this.localStream = null;
    }
  }

  handleConnectionFailure(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.restartIce();
      setTimeout(() => {
        if (peerConnection.connectionState === 'failed') {
          this.cleanupPeerConnection(userId);
          this.socket.emit('webrtc:connection-failed', { targetUserId: userId });
        }
      }, 5000); // Give it 5 seconds to recover
    }
  }

  handleDisconnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      setTimeout(() => {
        if (peerConnection.connectionState === 'disconnected') {
          peerConnection.restartIce();
        }
      }, 2000); // Wait 2 seconds before attempting reconnection
    }
  }

  cleanupPeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  handleError(error) {
    console.error('WebRTC error:', error);
    // Implement appropriate error handling
  }
}

export default WebRTCService; 