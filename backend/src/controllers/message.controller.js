import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req,res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar:", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};


export const getMessages = async (req,res) => {
    try {
        const {id:userToChatId} = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        })

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessage Controller:", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const sendMessage = async (req,res) => {
    try {
        const {text,image, selfDestruct, destructTime } = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if (image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            selfDestruct: selfDestruct || false,
            destructTime: destructTime || null,
        });

        await newMessage.save();

        // real time functinality here
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        };

        //self-destruct logic
        if (selfDestruct && destructTime) {
            setTimeout(async () => {
                await Message.findByIdAndDelete(newMessage._id);
                // Optional: emit event to notify clients of deletion
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("messageDeleted", newMessage._id);
                }
                io.to(senderId.toString()).emit("messageDeleted", newMessage._id);
            }, destructTime * 1000);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage Controller:", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};