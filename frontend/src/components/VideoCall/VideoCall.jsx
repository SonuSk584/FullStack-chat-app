import React, { useEffect, useRef, useState } from 'react';
import { useSocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { BsMicFill, BsMicMuteFill, BsCameraVideoFill, BsCameraVideoOffFill, BsTelephoneXFill, BsTelephone } from 'react-icons/bs';

const VideoCall = ({ 
  isReceivingCall, 
  caller, 
  onAccept, 
  onReject, 
  onEndCall,
  isGroupCall,
  participants = [],
  callType
}) => {
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [showModal, setShowModal] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const { socket } = useSocketContext();
  const { user } = useAuth();

  useEffect(() => {
    if (!isReceivingCall) {
      startLocalStream();
    }

    // Listen for call rejection
    const handleCallRejected = ({ from }) => {
      console.log('Call rejected by:', from);
      cleanupAndClose(true);
    };

    // Listen for call end
    const handleCallEnded = ({ from }) => {
      console.log('Call ended by:', from);
      cleanupAndClose(false);
    };

    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isReceivingCall, socket]);

  useEffect(() => {
    if (isReceivingCall) {
      const notification = new Audio('/call-ringtone.mp3');
      notification.loop = true;
      notification.play().catch(error => console.log('Audio play error:', error));

      return () => {
        notification.pause();
        notification.currentTime = 0;
      };
    }
  }, [isReceivingCall]);

  const cleanupAndClose = (wasRejected = false) => {
    console.log('Cleaning up and closing...', wasRejected ? 'Call rejected' : 'Call ended');
    setShowModal(false);
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
    }
    Object.values(peerConnections.current).forEach(pc => {
      pc.close();
      console.log('Peer connection closed');
    });
    peerConnections.current = {};
    
    if (wasRejected) {
      onReject();
    } else {
      onEndCall();
    }
  };

  const startLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      // Initialize peer connections for each participant
      participants.forEach(participant => {
        if (participant.id !== user._id) {
          createPeerConnection(participant.id, mediaStream);
        }
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // If we can't get media access, end the call
      cleanupAndClose(true);
    }
  };

  const createPeerConnection = (participantId, mediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.current[participantId] = peerConnection;

    // Add local tracks to the peer connection
    mediaStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, mediaStream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: participantId
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      if (remoteVideoRefs.current[participantId]) {
        remoteVideoRefs.current[participantId].srcObject = event.streams[0];
      }
    };

    return peerConnection;
  };

  const handleAcceptCall = async () => {
    await startLocalStream();
    onAccept();
  };

  const handleReject = () => {
    console.log('Rejecting call...');
    const targetId = caller?.id || participants[0]?.id;
    console.log('Sending reject to:', targetId);
    
    // Emit rejection event to the caller
    socket.emit('reject-call', { 
      to: targetId,
      from: user._id 
    });
    cleanupAndClose(true);
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream && callType === 'video') {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    console.log('Ending call...');
    const targetId = participants[0]?.id || caller?.id;
    console.log('Sending end call to:', targetId);
    
    socket.emit('end-call', { 
      to: targetId,
      from: user._id 
    });
    cleanupAndClose(false);
  };

  if (!showModal) return null;

  if (isReceivingCall) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              {callType === 'video' ? (
                <BsCameraVideoFill size={20} className="text-blue-500" />
              ) : (
                <BsTelephone size={20} className="text-blue-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {caller?.name || 'Unknown'}
              </h3>
              <p className="text-sm text-gray-500">
                Incoming {callType} call
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleReject}
              className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 text-sm"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptCall}
              className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 text-sm"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl h-[75vh]">
        <div className="space-y-4 h-full">
          {callType === 'video' && (
            <div className="grid grid-cols-4 gap-4 h-[calc(100%-80px)]">
              <div className="relative col-span-1">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg bg-gray-900"
                />
                <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </span>
              </div>
              {participants.map((participant) => (
                <div key={participant.id} className="relative col-span-3">
                  <video
                    ref={el => remoteVideoRefs.current[participant.id] = el}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg bg-gray-900"
                  />
                  <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                    {participant.name}
                  </span>
                </div>
              ))}
            </div>
          )}
          {callType === 'audio' && (
            <div className="text-center py-8 h-[calc(100%-80px)]">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center">
                  <BsMicFill size={48} className="text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold">
                  {participants.length > 0 ? participants[0].name : 'Connecting...'}
                </h3>
                <p className="text-gray-500">Audio Call</p>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-6 pt-4">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-500'} hover:opacity-90`}
            >
              {isMuted ? (
                <BsMicMuteFill size={28} className="text-white" />
              ) : (
                <BsMicFill size={28} className="text-white" />
              )}
            </button>
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-500'} hover:opacity-90`}
              >
                {isVideoOff ? (
                  <BsCameraVideoOffFill size={28} className="text-white" />
                ) : (
                  <BsCameraVideoFill size={28} className="text-white" />
                )}
              </button>
            )}
            <button
              onClick={handleEndCall}
              className="bg-red-500 p-4 rounded-full hover:bg-red-600"
            >
              <BsTelephoneXFill size={28} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall; 