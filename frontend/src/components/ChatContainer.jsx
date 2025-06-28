import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import formatMessageTime from "../lib/utils";
import { importPrivateKey, decryptAESKeyWithRSA, decryptWithAES } from "../lib/crypto";

const ChatContainer = () => {
  const { messages, getMessages, isMessagesLoading, selectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState([]);


  useEffect(() => {
    const decryptMessages = async () => {
      await getMessages(selectedUser._id);

      const privateKeyBase64 = localStorage.getItem("privateKey");
      if (!privateKeyBase64) {
        console.log("Private key missing. Cannot decrypt messages.");
        return;
      }

      const privateKey = await importPrivateKey(privateKeyBase64);

      const promises = useChatStore.getState().messages.map(async (msg) => {
        try {
          const encryptedAESKey = msg.senderId === authUser._id
            ? msg.aesKeyForSender
            : msg.aesKeyForReceiver;

          const aesKey = await decryptAESKeyWithRSA(encryptedAESKey, privateKey);


          const decryptedText = msg.text
            ? await decryptWithAES(msg.text, msg.textIV, aesKey)
            : "";

          const decryptedImage =
            msg.image && msg.image.startsWith("http")
              ? msg.image // skip decryption for cloudinary URL
              : msg.image
                ? await decryptWithAES(msg.image, msg.imageIV, aesKey)
                : "";


          return { ...msg, text: decryptedText, image: decryptedImage };
        } catch (err) {
          console.error("Decryption error:", err);
          return { ...msg, text: "[Unable to decrypt]", image: null };
        }
      });

      const results = await Promise.all(promises);
      setDecryptedMessages(results);
    };

    decryptMessages();
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id]);

  useEffect(() => {
    const { socket } = useAuthStore.getState();
    if (!socket || !authUser || !selectedUser) return;

    const handleNewMessage = async (msg) => {
      // Only show if the message is from or to the selected user
      const isRelevant =
        msg.senderId === selectedUser._id || msg.receiverId === selectedUser._id;
      if (!isRelevant) return;

      try {
        const privateKeyBase64 = localStorage.getItem("privateKey");
        if (!privateKeyBase64) return;

        const privateKey = await importPrivateKey(privateKeyBase64);
        const encryptedAESKey =
          msg.senderId === authUser._id
            ? msg.aesKeyForSender
            : msg.aesKeyForReceiver;

        const aesKey = await decryptAESKeyWithRSA(encryptedAESKey, privateKey);

        const decryptedText = msg.text
          ? await decryptWithAES(msg.text, msg.textIV, aesKey)
          : "";

        const decryptedImage = msg.image || "";

        const decryptedMessage = {
          ...msg,
          text: decryptedText,
          image: decryptedImage,
        };

        setDecryptedMessages((prev) => [...prev, decryptedMessage]);
      } catch (err) {
        console.error("Error decrypting new message:", err);
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [authUser, selectedUser]);


  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [decryptedMessages]);

  // Screenshot & security protection
  useEffect(() => {
    const blockPrintScreen = (e) => {
      if (e.key === "PrintScreen") {
        alert("🚫 Screenshot is not allowed.");
        navigator.clipboard.writeText("Screenshots are disabled on this chat.");
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    const detectTouchHold = (e) => {
      // basic touch event detection to trigger overlay on long press
      setShowOverlay(true);
      setTimeout(() => setShowOverlay(false), 3000);
    };

    window.addEventListener("keydown", blockPrintScreen);
    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("touchstart", detectTouchHold);

    return () => {
      window.removeEventListener("keydown", blockPrintScreen);
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("touchstart", detectTouchHold);
    };
  }, []);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      {/* Screenshot Protection Watermark/Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center pointer-events-none">
          <p className="text-white text-sm font-bold">Screenshot blocked</p>
        </div>
      )}

      {/* Dynamic Watermark */}
      <div className="absolute inset-0 z-10 pointer-events-none select-none opacity-10 text-[10px] p-4 flex flex-wrap">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="m-2 rotate-[-20deg] text-gray-500"
            style={{ whiteSpace: "nowrap" }}
          >
            {authUser?.username || "Protected User"}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {decryptedMessages.map((message) => (
          <div key={message._id} className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`} ref={messageEndRef}>
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="Profile Pic"
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
                <img src={message.image} alt="attachment" className="sm:max-w-[200px] rounded-md mb-2" />
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