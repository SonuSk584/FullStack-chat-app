import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStrore";
import { useSocketContext } from "../context/SocketContext";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            const sortedMessages = res.data.sort((a, b) =>
                new Date(a.createdAt) - new Date(b.createdAt)
            );
            set({ messages: res.data, isMessagesLoading: false });
        } catch (error) {
            toast.error(error.response.data.message);
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser } = get();
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

            // Add the new message to state
        } catch (error) {
            toast.error(error.response.data.message);
            throw error;
        }
    },

    addMessage: (message) => {
        if (!message?._id || (!message.text && !message.image)) return;
        set((state) => {
            const isDuplicate = state.messages.some(m => m._id === message._id);
            if (!isDuplicate) {
                return { messages: [...state.messages, message] };
            }
            return state;
        });
    },
    subscribeToMessages: (socket) => {
        const { selectedUser } = get();
        if (!selectedUser || !socket) return;
        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            console.log("Socket received newMessage:", newMessage); 
            if (
                newMessage &&
                newMessage._id &&
                (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id) &&
                (newMessage.text || newMessage.image)
            ) {
                get().addMessage(newMessage);
            }
        });
    },

    unsubscribeFromMessages: (socket) => {
        if (socket) socket.off("newMessage");
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),
}));