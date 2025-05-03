import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3001",
        credentials: true,
    },
});

const onlineUsers = new Map();
export const getReceiverSocketId = (receiverId) => {
  return onlineUsers.get(receiverId.toString());
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId?.toString();
    console.log("User connected:", userId);
    if (userId) {
      onlineUsers.set(userId, socket.id);
    }

    // Handle initial connection
    if (userId !== "undefined") {
        onlineUsers.set(userId, socket.id);
        // Broadcast online users immediately after connection
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        console.log("User connected:", userId);
        console.log("Current online users:", Array.from(onlineUsers.keys()));
    }

    // Handle explicit user connection
    socket.on("userConnected", (userData) => {
        console.log("User explicitly connected:", userData);
        onlineUsers.set(userData.userId, socket.id);
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Handle messages
    socket.on("sendMessage", async (message) => {
      console.log("New message received at server:", message);
        const receiverSocketId = onlineUsers.get(message.receiverId);
        try {
          // Broadcast to receiver
          if (receiverSocketId) {
              console.log("Broadcasting to receiver:", receiverSocketId);
              socket.to(receiverSocketId).emit("newMessage", message);
          }
          
          // Send confirmation back to sender
          socket.emit("messageSent", message);
          
          // Broadcast to all clients in the chat
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
    socket.on("endCall", ({ to }) => {
        const receiverSocketId = onlineUsers.get(to);
        if (receiverSocketId) {
            socket.to(receiverSocketId).emit("callEnded");
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", userId);
        if (userId !== "undefined") {
            onlineUsers.delete(userId);
            // Broadcast updated online users list
            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
        }
    });
});

export { app, server, io };