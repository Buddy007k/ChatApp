import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";


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
        };
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({ messages: [...messages, res.data] });
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    subscribeToMessages: () => {
        const { selectedUser } = get();
        const socket = useAuthStore.getState().socket;
        const authUser = useAuthStore.getState().authUser;

        if (!selectedUser || !socket || !authUser) return;

        const handleNewMessage = (newMessage) => {
            const isRelevant =
                (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id) ||
                (newMessage.receiverId === selectedUser._id && newMessage.senderId === authUser._id);

            if (!isRelevant) return;

            set((state) => ({
                messages: [...state.messages, newMessage], // ✅ always use the latest state
            }));
        };

        socket.on("newMessage", handleNewMessage);

        // 🔥 Listen for message deletion (self-destruct)
        socket.on("messageDeleted", (messageId) => {
            get().removeMessage(messageId);
        });

        // Save handler reference if you need cleanup
        set({ _messageHandler: handleNewMessage });
    },


    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
        socket.off("messageDeleted");
    },

    removeMessage: (messageId) => {
        set((state) => ({
            messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
    },


    setSelectedUser: (selectedUser) => set({ selectedUser }),
}));