import { Server } from "socket.io";
import http from "http";
import express from "express";
import handleWebRTCSignaling from "../controllers/webRTCController.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001","https://fullstack-chat-app-4vsj.onrender.com"], // Add all possible origins
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3:true // Explicit transport order
  });

const onlineUsers = new Map();
export const getReceiverSocketId = (receiverId) => {
    return onlineUsers.get(receiverId?.toString());
  };

// Helper function to fetch socket by user ID
io.fetchSocket = async (userId) => {
  const socketId = onlineUsers.get(userId?.toString());
  return socketId ? io.sockets.sockets.get(socketId) : null;
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId?.toString();
  const userName = socket.handshake.query.username;
  
  console.log("Connection attempt from:", userId);
  
  if (userId !== "undefined") {
    socket.userId = userId;
    socket.userName = userName;
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log("User connected:", userId);
    console.log("Current online users:", Array.from(onlineUsers.keys()));
  }

  // Initialize WebRTC signaling for this socket
  handleWebRTCSignaling(io, socket);

  // Handle messages
  socket.on("sendMessage", async (message) => {
    console.log("New message received at server:", message);
    const receiverSocketId = onlineUsers.get(message.receiverId);
    try {
      if (receiverSocketId) {
        console.log("Broadcasting to receiver:", receiverSocketId);
        socket.to(receiverSocketId).emit("newMessage", message);
      }
      socket.emit("messageSent", message);
      io.emit("messageReceived", message);
    } catch (error) {
      console.error("Error broadcasting message:", error);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });

  // Handle call initiation
  socket.on("startCall", (data) => {
    const receiverSocketId = onlineUsers.get(data.recipientId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("incomingCall", {
        callerId: userId,
        callerName: socket.handshake.query.username,
        callType: data.callType,
        roomId: `${userId}-${data.recipientId}`
      });
    }
  });

  // Handle call rejection
  socket.on("reject-call", ({ to, from }) => {
    console.log(`Call rejected by ${from} for ${to}`);
    const receiverSocketId = onlineUsers.get(to);
    const callerSocketId = onlineUsers.get(from);
    
    if (receiverSocketId) {
      // Notify the person who was called that the call was rejected
      socket.to(receiverSocketId).emit("call-rejected", { from });
    }
    
    if (callerSocketId) {
      // Notify the caller that their call was rejected
      io.to(callerSocketId).emit("call-rejected", { from });
    }
  });

  // Handle call answer
  socket.on("answerCall", ({ to, answer, roomId }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("callAccepted", {
        answer,
        roomId
      });
    }
  });

  // Handle call end
  socket.on("end-call", ({ to, from }) => {
    console.log(`Call ended by ${from} for ${to}`);
    const receiverSocketId = onlineUsers.get(to);
    const callerSocketId = onlineUsers.get(from);
    
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("call-ended", { from });
    }
    
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-ended", { from });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", userId);
    if (userId !== "undefined") {
      onlineUsers.delete(userId);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    }
  });
});

export { app, server, io };