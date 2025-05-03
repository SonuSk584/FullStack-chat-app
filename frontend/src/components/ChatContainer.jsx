import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStrore";
import { formatMessageTime } from "../lib/utils";
import { useSocketContext } from "../context/SocketContext";

const ChatContainer = () => {
  const { socket } = useSocketContext();
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  // const handleNewMessage = useCallback((message) => {
  //   console.log("New message received in chat:", message);
  //   // Only add message if it's relevant to current chat
  //   if (message.senderId === selectedUser?._id || message.receiverId === selectedUser?._id) {
  //     addMessage(message);
  //     messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [selectedUser?._id, addMessage]);

  // useEffect(() => {
  //   if (socket) {
  //     // Listen for new messages
  //     socket.on("newMessage", handleNewMessage);
  //     socket.on("messageReceived", handleNewMessage);

  //     return () => {
  //       socket.off("newMessage");
  //       socket.off("messageReceived");
  //     };
  //   }
  // }, [socket, handleNewMessage]);
  useEffect(() => {
    if (selectedUser?._id && socket) {
      getMessages(selectedUser._id);
      subscribeToMessages(socket);
    }
    return () => {
      if (socket) unsubscribeFromMessages(socket);
    };
  }, [selectedUser?._id,socket]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Show loading state
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Show placeholder when no user is selected
  if (!selectedUser?._id) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;