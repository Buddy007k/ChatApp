import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, Timer, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { encryptAESKeyWithRSA, encryptWithAES, generateAESKey } from "../lib/crypto";
import { axiosInstance } from "../lib/axios";


const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [destructTime, setDestructTime] = useState(10);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    try {
      // 1. Fetch both sender and receiver public keys
      const resReceiver = await axiosInstance.get(`/auth/public-key/${selectedUser._id}`);
      const resSender = await axiosInstance.get(`/auth/public-key/${authUser._id}`);
      const receiverPublicKey = resReceiver.data.publicKey;
      const senderPublicKey = resSender.data.publicKey;


      // 2. Generate AES key
      const aesKey = await generateAESKey();

      // 3. Encrypt text (if present)
      const { cipher: encryptedText, iv: textIV } = text.trim()
        ? await encryptWithAES(text.trim(), aesKey)
        : { cipher: "", iv: "" };



      // 5. Encrypt AES key for receiver and sender
      const encryptedKeyForReceiver = await encryptAESKeyWithRSA(receiverPublicKey, aesKey);
      const encryptedKeyForSender = await encryptAESKeyWithRSA(senderPublicKey, aesKey);

      // 6. Send encrypted message
      await sendMessage({
        text: encryptedText,
        image: imagePreview,
        aesKeyForReceiver: encryptedKeyForReceiver,
        aesKeyForSender: encryptedKeyForSender,
        textIV,
        selfDestruct,
        destructTime: selfDestruct ? destructTime : null,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      setSelfDestruct(false);
      setDestructTime(10);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send meassage: ", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* 🔥 Self-Destruct Toggle UI */}
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selfDestruct}
            onChange={(e) => setSelfDestruct(e.target.checked)}
          />
          <span className="text-sm">Self-destruct</span>
        </label>
        {selfDestruct && (
          <div className="flex items-center gap-1">
            <Timer size={16} />
            <input
              type="number"
              className="input input-xs input-bordered w-20"
              min={5}
              max={600}
              value={destructTime}
              onChange={(e) => setDestructTime(Number(e.target.value))}
            />
            <span className="text-xs">sec</span>
          </div>
        )}
      </div>


      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
              ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput;