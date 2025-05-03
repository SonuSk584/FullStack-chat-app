import Call from '../models/call.model.js';

export const startCall = async (req, res) => {
    try {
        const { recipientId, callType } = req.body;
        const callerId = req.user._id;

        const newCall = await Call.create({
            caller: callerId,
            recipient: recipientId,
            callType
        });

        await newCall.populate('caller recipient', 'fullName profilePic');
        res.status(201).json(newCall);
    } catch (error) {
        console.error("Error in startCall:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateCallStatus = async (req, res) => {
    try {
        const { callId, status } = req.body;
        
        const call = await Call.findByIdAndUpdate(
            callId,
            { 
                status,
                endedAt: ['ended', 'rejected', 'missed'].includes(status) ? Date.now() : null 
            },
            { new: true }
        ).populate('caller recipient', 'fullName profilePic');

        if (!call) {
            return res.status(404).json({ error: "Call not found" });
        }

        res.status(200).json(call);
    } catch (error) {
        console.error("Error in updateCallStatus:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const calls = await Call.find({
            $or: [{ caller: userId }, { recipient: userId }]
        })
        .sort({ createdAt: -1 })
        .populate('caller recipient', 'fullName profilePic')
        .limit(50);

        res.status(200).json(calls);
    } catch (error) {
        console.error("Error in getCallHistory:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};