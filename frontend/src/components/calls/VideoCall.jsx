import { useEffect, useRef, useState } from 'react';
import { BsMicFill, BsMicMuteFill, BsCameraVideoFill, BsCameraVideoOffFill, BsTelephoneXFill } from 'react-icons/bs';

const VideoCall = ({ onEndCall, recipientId, socket, callType }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        });
        setLocalStream(stream);
        localVideoRef.current.srcObject = stream;
        initializePeerConnection(stream);
      } catch (error) {
        console.error('Error accessing media devices:', error);
        onEndCall();
      }
    };

    initializeMedia();
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const initializePeerConnection = (stream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', {
          candidate: event.candidate,
          to: recipientId
        });
      }
    };
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <div className="fixed inset-0 bg-base-300 z-50">
      <div className="relative h-full flex flex-col">
        {/* Video containers */}
        <div className="flex-1 relative">
          {/* Remote video (big) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Local video (small) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-48 rounded-lg border-2 border-primary"
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <button 
            onClick={toggleMute}
            className="btn btn-circle btn-primary"
          >
            {isMuted ? <BsMicMuteFill size={20} /> : <BsMicFill size={20} />}
          </button>

          {callType === 'video' && (
            <button 
              onClick={toggleCamera}
              className="btn btn-circle btn-primary"
            >
              {isCameraOff ? <BsCameraVideoOffFill size={20} /> : <BsCameraVideoFill size={20} />}
            </button>
          )}

          <button 
            onClick={onEndCall}
            className="btn btn-circle btn-error"
          >
            <BsTelephoneXFill size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;