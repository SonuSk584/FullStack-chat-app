import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuthStore } from "../store/useAuthStrore";
import useCallStore from "../store/useCallStore";

const SocketContext = createContext();

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within SocketContextProvider");
  }
  return context;
};

export const SocketContextProvider = ({ children }) => {
  const { authUser } = useAuthStore();
  const { setIncomingCall, setActiveCall } = useCallStore();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (authUser) {
      const newSocket = io("http://localhost:5001" ||"https://fullstack-chat-app-4vsj.onrender.com", {
        query: {
          userId: authUser?._id,
          username: authUser?.fullName
        },
        withCredentials: true
      });

      // Debug connection status
      newSocket.on("connect", () => {
        console.log("Socket connected with ID:", newSocket.id);
        // Explicitly emit user connection
        newSocket.emit("userConnected", {
          userId: authUser._id,
          username: authUser.fullName
        });
      });

      // Handle online users updates
      newSocket.on("onlineUsers", (users) => {
        console.log("Online users updated:", users);
        setOnlineUsers(users);
      });

      // Handle incoming calls
      newSocket.on("incomingCall", (data) => {
        console.log("Incoming call:", data);
        setIncomingCall({
          callerId: data.callerId,
          callerName: data.callerName,
          callerProfilePic: data.callerProfilePic,
          callType: data.callType,
          roomId: data.roomId,
        });
      });

      // Handle call acceptance
      newSocket.on("callAccepted", (data) => {
        setActiveCall(prev => ({
          ...prev,
          status: 'accepted',
          roomId: data.roomId
        }));
      });

      // Handle call rejection/end
      newSocket.on("callEnded", () => {
        setActiveCall(null);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [authUser]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};