import { useEffect } from 'react';
import useCallStore from '../../store/useCallStore';
import { useSocketContext } from '../../context/SocketContext';
import VideoCall from './VideoCall';
import CallNotification from './CallNotification';

const CallManager = () => {
    const { activeCall, incomingCall, setActiveCall, resetCall } = useCallStore();
    const { socket } = useSocketContext();

    useEffect(() => {
        if (!socket) return;

        socket.on("callAccepted", (data) => {
            console.log("Call accepted:", data);
            setActiveCall(prev => ({ ...prev, status: 'accepted' }));
        });

        socket.on("callEnded", () => {
            console.log("Call ended");
            resetCall();
        });

        return () => {
            socket.off("callAccepted");
            socket.off("callEnded");
        };
    }, [socket]);

    const handleAcceptCall = () => {
        if (!incomingCall || !socket) return;
        
        socket.emit("answerCall", {
            to: incomingCall.callerId,
            answer: true
        });

        setActiveCall({
            ...incomingCall,
            status: 'accepted',
            isOutgoing: false
        });
    };

    const handleRejectCall = () => {
        if (!incomingCall || !socket) return;
        
        socket.emit("rejectCall", {
            to: incomingCall.callerId
        });
        resetCall();
    };

    return (
        <>
            {incomingCall && (
                <CallNotification
                    caller={incomingCall}
                    onAccept={handleAcceptCall}
                    onReject={handleRejectCall}
                />
            )}
            {activeCall && (
                <VideoCall
                    call={activeCall}
                    onEndCall={() => {
                        socket?.emit("endCall", {
                            to: activeCall.isOutgoing ? activeCall.recipientId : activeCall.callerId
                        });
                        resetCall();
                    }}
                />
            )}
        </>
    );
};

export default CallManager;