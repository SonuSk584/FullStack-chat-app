import { BsTelephone, BsCameraVideo, BsThreeDotsVertical } from 'react-icons/bs';
import { useSocketContext } from '../context/SocketContext';
import { useVideoCall } from '../context/VideoCallContext';
import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';

const ChatHeader = () => {
  const { socket, onlineUsers } = useSocketContext();
  const { selectedUser } = useChatStore();
  const { initiateCall } = useVideoCall();
  
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

  const isOnline = onlineUsers?.includes(selectedUser._id);

  const handleCall = (type) => {
    if (!isOnline) return;
    initiateCall(selectedUser._id, selectedUser.fullName, false, type);
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
        {isOnline && (
          <>
            <button
              onClick={() => handleCall('audio')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              title="Audio Call"
            >
              <BsTelephone size={20} className="text-blue-500" />
            </button>
            <button
              onClick={() => handleCall('video')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              title="Video Call"
            >
              <BsCameraVideo size={20} className="text-blue-500" />
            </button>
          </>
        )}
        <button className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
          <BsThreeDotsVertical size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;