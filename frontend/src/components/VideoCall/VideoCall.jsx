import React, { useEffect, useRef, useState } from 'react';
import { useSocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { BsMicFill, BsMicMuteFill, BsCameraVideoFill, BsCameraVideoOffFill, BsTelephoneXFill } from 'react-icons/bs';

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
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const { socket } = useSocketContext();
  const { user } = useAuth();

  useEffect(() => {
    if (isReceivingCall) {
      // Show incoming call notification
      const notification = new Audio('/call-ringtone.mp3');
      notification.loop = true;
      notification.play();

      return () => {
        notification.pause();
        notification.currentTime = 0;
      };
    }
  }, [isReceivingCall]);

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
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-4xl">
        {isReceivingCall ? (
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold mb-2">
              Incoming {isGroupCall ? 'Group ' : ''}{callType === 'video' ? 'Video' : 'Audio'} Call from {caller?.name}
            </h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={onAccept}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={onReject}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {callType === 'video' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full rounded-lg bg-gray-900"
                  />
                  <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                    You
                  </span>
                </div>
                {participants.map((participant) => (
                  <div key={participant.id} className="relative">
                    <video
                      ref={el => remoteVideoRefs.current[participant.id] = el}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg bg-gray-900"
                    />
                    <span className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                      {participant.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {callType === 'audio' && (
              <div className="text-center py-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                    <BsMicFill size={40} className="text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    {participants.length > 0 ? participants[0].name : 'Connecting...'}
                  </h3>
                  <p className="text-gray-500">Audio Call</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-500'}`}
              >
                {isMuted ? (
                  <BsMicMuteFill size={24} className="text-white" />
                ) : (
                  <BsMicFill size={24} className="text-white" />
                )}
              </button>
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-500'}`}
                >
                  {isVideoOff ? (
                    <BsCameraVideoOffFill size={24} className="text-white" />
                  ) : (
                    <BsCameraVideoFill size={24} className="text-white" />
                  )}
                </button>
              )}
              <button
                onClick={onEndCall}
                className="bg-red-500 p-3 rounded-full hover:bg-red-600"
              >
                <BsTelephoneXFill size={24} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall; 