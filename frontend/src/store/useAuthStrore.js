import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.PROD
  ? "https://fullstack-chat-app-3n26.onrender.com"
  : "http://localhost:5001";


export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser,socket } = get();
    if (!authUser || get().socket?.connected) return;

    // const socket = io(BASE_URL, {
    //   query: {
    //     userId: authUser._id,
    //   },
    // });
    if (!authUser || socket?.connected) return;
    if (socket) {
      socket.off(); 
      socket.disconnect();
      set({ socket: null });
    }
    const newSocket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
      reconnectionAttempts: 3,
      timeout: 5000,
    });
    // socket.connect();
      // Add error handling
  newSocket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  newSocket.on("connect", () => {
    console.log("✅ Socket connected with ID:", newSocket.id);
  });

  // Match server event name
  newSocket.on("onlineUsers", (userIds) => {
    set({ onlineUsers: userIds });
  });
  newSocket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  set({ socket: newSocket });
},
  //   console.log("Socket connected with ID:", socket.id);

  //   set({  socket });

  //   socket.on("getOnlineUsers", (userIds) => {
  //     set({ onlineUsers: userIds });
  //   });
  // },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));