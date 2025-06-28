import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        aesKeyForReceiver: {
            type: String, // AES key encrypted with receiver's RSA public key
            required: true,
        },
        aesKeyForSender: {
            type: String, // AES key encrypted with sender's RSA public key
            required: true,
        },
        textIV: {
            type: String, // base64-encoded IV used to encrypt text
        },
        imageIV: {
            type: String, // base64-encoded IV used to encrypt image
        },
        selfDestruct: {
            type: Boolean,
            default: false,
        },
        destructTime: {
            type: Number, // in seconds
            default: null,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;