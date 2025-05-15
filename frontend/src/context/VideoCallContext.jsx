import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocketContext } from './SocketContext';
import { useAuth } from './AuthContext';
import WebRTCService from '../services/webRTC';
import VideoCall from '../components/VideoCall/VideoCall';

const VideoCallContext = createContext();

export const VideoCallProvider = ({ children }) => {
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const [webRTC, setWebRTC] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'

  useEffect(() => {
    if (socket) {
      const webRTCService = new WebRTCService(socket);
      setWebRTC(webRTCService);

      socket.on('webrtc:incoming-call', handleIncomingCall);
      socket.on('webrtc:call-accepted', handleCallAccepted);
      socket.on('webrtc:call-rejected', handleCallRejected);
      socket.on('webrtc:participant-joined', handleParticipantJoined);
      socket.on('webrtc:participant-left', handleParticipantLeft);

      return () => {
        socket.off('webrtc:incoming-call', handleIncomingCall);
        socket.off('webrtc:call-accepted', handleCallAccepted);
        socket.off('webrtc:call-rejected', handleCallRejected);
        socket.off('webrtc:participant-joined', handleParticipantJoined);
        socket.off('webrtc:participant-left', handleParticipantLeft);
        webRTCService.endAllCalls();
        webRTCService.stopLocalStream();
      };
    }
  }, [socket]);

  const handleIncomingCall = (data) => {
    const { callerId, callerName, isGroup, type } = data;
    setIsReceivingCall(true);
    setCaller({ id: callerId, name: callerName });
    setIsGroupCall(isGroup);
    setCallType(type);
  };

  const handleCallAccepted = (data) => {
    const { userId, userName } = data;
    setParticipants(prev => [...prev, { id: userId, name: userName }]);
  };

  const handleCallRejected = (data) => {
    const { userId } = data;
    // Handle call rejection (show notification, etc.)
  };

  const handleParticipantJoined = (data) => {
    const { userId, userName } = data;
    setParticipants(prev => [...prev, { id: userId, name: userName }]);
  };

  const handleParticipantLeft = (data) => {
    const { userId } = data;
    setParticipants(prev => prev.filter(p => p.id !== userId));
  };

  const initiateCall = async (targetUserId, isGroup = false, type = 'video') => {
    try {
      await webRTC.startLocalStream(type === 'video');
      socket.emit('webrtc:initiate-call', {
        targetUserId,
        isGroup,
        type,
      });
      setIsInCall(true);
      setIsGroupCall(isGroup);
      setCallType(type);
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const acceptCall = async () => {
    try {
      await webRTC.startLocalStream(callType === 'video');
      socket.emit('webrtc:accept-call', {
        callerId: caller.id,
      });
      setIsReceivingCall(false);
      setIsInCall(true);
      setParticipants(prev => [...prev, caller]);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const rejectCall = () => {
    socket.emit('webrtc:reject-call', {
      callerId: caller.id,
    });
    setIsReceivingCall(false);
    setCaller(null);
    setCallType(null);
  };

  const endCall = () => {
    webRTC.endAllCalls();
    webRTC.stopLocalStream();
    setIsInCall(false);
    setParticipants([]);
    setIsGroupCall(false);
    setCallType(null);
    socket.emit('webrtc:end-call');
  };

  const addParticipant = (userId) => {
    if (isGroupCall && isInCall) {
      socket.emit('webrtc:add-participant', {
        targetUserId: userId,
      });
    }
  };

  const value = {
    isInCall,
    isReceivingCall,
    caller,
    participants,
    isGroupCall,
    callType,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    addParticipant,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
      {(isInCall || isReceivingCall) && (
        <VideoCall
          isReceivingCall={isReceivingCall}
          caller={caller}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEndCall={endCall}
          isGroupCall={isGroupCall}
          participants={participants}
          callType={callType}
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