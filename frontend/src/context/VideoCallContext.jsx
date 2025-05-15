import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from './SocketContext';
import { useAuth } from './AuthContext';
import WebRTCService from '../services/webRTC';
import VideoCall from '../components/VideoCall/VideoCall';
import toast from 'react-hot-toast';

const VideoCallContext = createContext();

export const VideoCallProvider = ({ children }) => {
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const webRTCRef = useRef(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [isCallingUser, setIsCallingUser] = useState(false);
  const [caller, setCaller] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [connectionState, setConnectionState] = useState({});

  const cleanup = useCallback(() => {
    if (webRTCRef.current) {
      webRTCRef.current.endAllCalls();
      webRTCRef.current.stopLocalStream();
    }
    setIsInCall(false);
    setIsReceivingCall(false);
    setIsCallingUser(false);
    setCaller(null);
    setTargetUser(null);
    setParticipants([]);
    setIsGroupCall(false);
    setCallType(null);
    setConnectionState({});
  }, []);

  const handleIncomingCall = useCallback((data) => {
    const { callerId, callerName, isGroup, type } = data;
    if (!isInCall) {
      setIsReceivingCall(true);
      setCaller({ id: callerId, name: callerName });
      setIsGroupCall(isGroup);
      setCallType(type);
      // Play ringtone
      const audio = new Audio('/call-ringtone.mp3');
      audio.loop = true;
      audio.play().catch(console.error);
    } else {
      // Automatically reject if already in a call
      socket?.emit('webrtc:reject-call', {
        callerId,
        reason: 'User is busy in another call'
      });
    }
  }, [isInCall, socket]);

  const handleCallAccepted = useCallback((data) => {
    const { userId, userName } = data;
    setIsCallingUser(false);
    setParticipants(prev => [...prev, { id: userId, name: userName }]);
    setIsInCall(true);
    toast.success(`${userName} joined the call`);
  }, []);

  const handleCallRejected = useCallback((data) => {
    const { userId, userName, reason } = data;
    setIsCallingUser(false);
    toast.error(reason || `Call rejected by ${userName}`);
    cleanup();
  }, [cleanup]);

  const handleParticipantJoined = useCallback((data) => {
    const { userId, userName } = data;
    setParticipants(prev => [...prev, { id: userId, name: userName }]);
    toast.success(`${userName} joined the call`);
  }, []);

  const handleParticipantLeft = useCallback((data) => {
    const { userId } = data;
    setParticipants(prev => {
      const participant = prev.find(p => p.id === userId);
      if (participant) {
        toast.info(`${participant.name} left the call`);
      }
      return prev.filter(p => p.id !== userId);
    });
  }, []);

  const handleWebRTCError = useCallback((error) => {
    console.error('WebRTC error:', error);
    toast.error(error.message || 'An error occurred with the call');
    if (error.code === 'FATAL') {
      cleanup();
    }
  }, [cleanup]);

  const handleConnectionFailure = useCallback((data) => {
    const { userId, reason } = data;
    setParticipants(prev => {
      const participant = prev.find(p => p.id === userId);
      toast.error(`Connection failed with ${participant?.name || 'participant'}: ${reason}`);
      return prev;
    });
    setConnectionState(prev => ({
      ...prev,
      [userId]: 'failed'
    }));
  }, []);

  const handlePeerDisconnected = useCallback((data) => {
    const { userId, reason } = data;
    setParticipants(prev => {
      const participant = prev.find(p => p.id === userId);
      if (participant) {
        toast.error(`${participant.name} disconnected: ${reason}`);
      }
      return prev.filter(p => p.id !== userId);
    });
  }, []);

  // Initialize WebRTC service and set up event handlers
  useEffect(() => {
    if (socket && !webRTCRef.current) {
      webRTCRef.current = new WebRTCService(socket);
      
      // Set up connection state change handler
      webRTCRef.current.setOnConnectionStateChange((userId, state) => {
        setConnectionState(prev => ({
          ...prev,
          [userId]: state
        }));
      });

      // Set up socket event listeners
      const events = {
        'webrtc:incoming-call': handleIncomingCall,
        'webrtc:call-accepted': handleCallAccepted,
        'webrtc:call-rejected': handleCallRejected,
        'webrtc:participant-joined': handleParticipantJoined,
        'webrtc:participant-left': handleParticipantLeft,
        'webrtc:error': handleWebRTCError,
        'webrtc:connection-failed': handleConnectionFailure,
        'webrtc:peer-disconnected': handlePeerDisconnected
      };

      // Register all event listeners
      Object.entries(events).forEach(([event, handler]) => {
        socket.on(event, handler);
      });

      // Cleanup function
      return () => {
        // Unregister all event listeners
        Object.entries(events).forEach(([event, handler]) => {
          socket.off(event, handler);
        });
        cleanup();
        webRTCRef.current = null;
      };
    }
  }, [
    socket,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleParticipantJoined,
    handleParticipantLeft,
    handleWebRTCError,
    handleConnectionFailure,
    handlePeerDisconnected,
    cleanup
  ]);

  const initiateCall = useCallback(async (targetUserId, targetUserName, isGroup = false, type = 'video') => {
    try {
      if (isInCall || isCallingUser) {
        toast.error('Already in a call');
        return;
      }
      
      await webRTCRef.current?.startLocalStream(type);
      socket?.emit('webrtc:initiate-call', {
        targetUserId,
        isGroup,
        type,
      });
      setIsCallingUser(true);
      setTargetUser({ id: targetUserId, name: targetUserName });
      setIsGroupCall(isGroup);
      setCallType(type);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to start call: ' + (error.message || 'Unknown error'));
      cleanup();
    }
  }, [isInCall, isCallingUser, socket, cleanup]);

  const acceptCall = useCallback(async () => {
    try {
      if (isInCall) {
        toast.error('Already in a call');
        return;
      }

      await webRTCRef.current?.startLocalStream(callType);
      socket?.emit('webrtc:accept-call', {
        callerId: caller?.id,
      });
      setIsReceivingCall(false);
      setIsInCall(true);
      setParticipants(prev => [...prev, caller]);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call: ' + (error.message || 'Unknown error'));
      cleanup();
    }
  }, [isInCall, socket, caller, callType, cleanup]);

  const rejectCall = useCallback((reason = 'Call rejected') => {
    socket?.emit('webrtc:reject-call', {
      callerId: caller?.id,
      reason
    });
    cleanup();
  }, [socket, caller, cleanup]);

  const cancelCall = useCallback(() => {
    if (isCallingUser && targetUser) {
      socket?.emit('webrtc:cancel-call', {
        targetUserId: targetUser.id
      });
      cleanup();
    }
  }, [isCallingUser, targetUser, socket, cleanup]);

  const endCall = useCallback((reason = 'Call ended') => {
    if (webRTCRef.current) {
      webRTCRef.current.endAllCalls();
      webRTCRef.current.stopLocalStream();
    }
    socket?.emit('webrtc:end-call', { reason });
    cleanup();
  }, [socket, cleanup]);

  const addParticipant = useCallback((userId) => {
    if (isGroupCall && isInCall) {
      socket?.emit('webrtc:add-participant', {
        targetUserId: userId,
      });
    }
  }, [isGroupCall, isInCall, socket]);

  const value = {
    isInCall,
    isReceivingCall,
    isCallingUser,
    caller,
    targetUser,
    participants,
    isGroupCall,
    callType,
    connectionState,
    initiateCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    addParticipant,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
      {(isInCall || isReceivingCall || isCallingUser) && (
        <VideoCall
          isReceivingCall={isReceivingCall}
          isCallingUser={isCallingUser}
          caller={caller}
          targetUser={targetUser}
          onAccept={acceptCall}
          onReject={rejectCall}
          onCancel={cancelCall}
          onEndCall={endCall}
          isGroupCall={isGroupCall}
          participants={participants}
          callType={callType}
          connectionState={connectionState}
        />
      )}
    </VideoCallContext.Provider>
  );
};

export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

export default VideoCallContext; 