import cloudinary from "../lib/claudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")
        res.status(200).json(filteredUsers)
    } catch (error) {
        console.error("Error in getUserForSidebar:", error.message);
        res.status(500).json({ error: "internal server error" });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const senderId = req.user._id.toString();
        const messages = await Message.find({
            $or: [
                { senderId: senderId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: senderId }
            ]
        }).sort({ createdAt: 1 }); // Add sorting to maintain message order

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error in getmessages:", error.message);
        res.status(500).json({ error: "internal server error" });
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });


        // Save message first
        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id);

        // Emit to receiver only once
        
        const receiverSocketId = getReceiverSocketId(receiverId);
        const senderSocketId = getReceiverSocketId(senderId);
        console.log("Sender ID:", senderId, "Sender Socket ID:", senderSocketId);
        console.log("Receiver ID:", receiverId, "Receiver Socket ID:", receiverSocketId);
        if (populatedMessage && populatedMessage._id && (populatedMessage.text || populatedMessage.image)) {
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", populatedMessage);
                console.log("Emitted to receiver:", receiverSocketId);
            }
            if (senderSocketId) {
                io.to(senderSocketId).emit("newMessage", populatedMessage);
                console.log("Emitted to sender:", senderSocketId);
            }
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error send message controller:", error.message);
        res.status(500).json({ error: "internal server error" })
    }
}