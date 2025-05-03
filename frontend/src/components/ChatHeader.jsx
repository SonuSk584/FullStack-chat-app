import { BsTelephone, BsCameraVideo, BsThreeDotsVertical } from 'react-icons/bs';
import useCallStore from '../store/useCallStore';
import { useSocketContext } from '../context/SocketContext';
import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';

const ChatHeader = () => {
  const { setActiveCall } = useCallStore();
  const { socket, onlineUsers } = useSocketContext();
  const { selectedUser } = useChatStore();
  
  // Debug online status
  
  useEffect(() => {
    console.log("ChatHeader rendered with:", {
      selectedUser,
      onlineUsers,
      hasSocket: !!socket
    });
  }, [selectedUser, onlineUsers, socket]);
  if (!selectedUser?._id) {
    console.warn("ChatHeader: selectedUser or selectedUser._id is undefined");
    return null;
  }
  console.log("Selected user:", selectedUser?._id);
  console.log("Online users:", onlineUsers);
  
  // Fix: Ensure proper comparison with online users array
  const isOnline = onlineUsers?.includes(selectedUser._id);

  const handleStartCall = (callType) => {
    if (!selectedUser?._id || !socket || !isOnline) {
      console.log("Call prevented:", {
        hasUser: Boolean(selectedUser?._id),
        hasSocket: Boolean(socket),
        isOnline
      });
      return;
    }

    console.log("Initiating call with:", selectedUser.fullName);

    const callData = {
      recipientId: selectedUser._id,
      callType
    };

    socket.emit("startCall", callData);

    setActiveCall({
      recipientId: selectedUser._id,
      recipientName: selectedUser.fullName,
      recipientProfilePic: selectedUser.profilePic,
      callType,
      isOutgoing: true
    });
  };

  return (
    <div className="bg-base-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 rounded-full">
            <img 
              src={selectedUser.profilePic || "/avatar.png"} 
              alt="user avatar" 
              className="rounded-full"
            />
          </div>
        </div>
        <div>
          <h3 className="font-bold">{selectedUser.fullName}</h3>
          <p className="text-sm text-gray-500">
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleStartCall('audio')} 
          className="btn btn-ghost btn-circle"
          disabled={!isOnline}
          title={!isOnline ? "User is offline" : "Start audio call"}
        >
          <BsTelephone size={20} />
        </button>
        <button 
          onClick={() => handleStartCall('video')} 
          className="btn btn-ghost btn-circle"
          disabled={!isOnline}
          title={!isOnline ? "User is offline" : "Start video call"}
        >
          <BsCameraVideo size={20} />
        </button>
        <button className="btn btn-ghost btn-circle">
          <BsThreeDotsVertical size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;