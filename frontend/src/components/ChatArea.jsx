import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
	Send,
	Smile,
	Paperclip,
	MoreVertical,
	Search,
	Check,
	ArrowLeft,
} from "lucide-react";

export default function ChatArea({
	chat,
	messages,
	onSendMessage,
	onToggleInfo,
	typingUser,
	onBack,
}) {
	const { user } = useAuth();
	const { socket, onlineUsers } = useSocket();
	const [inputText, setInputText] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const messagesEndRef = useRef(null);
	const typingTimeoutRef = useRef(null);

	const EMOJIS = [
		"😀", "😂", "😍", "👍", "🙏", "🔥", "👏", "🎉",
		"❤️", "🤔", "😎", "💡", "🚀", "💯", "✨", "👀",
		"👋", "😭", "😡", "😱", "💩", "💻", "🍕", "🍻",
	];

	// Scroll to bottom
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, typingUser]);

	// Close emoji picker when switching chats
	useEffect(() => {
		setShowEmojiPicker(false);
	}, [chat]);

	// Handle typing event emit
	const handleInputChange = (e) => {
		setInputText(e.target.value);

		if (!socket || !chat) return;

		if (!isTyping) {
			setIsTyping(true);
			socket.emit("typing", {
				chatId: chat._id,
				username: user.username,
				isTyping: true,
			});
		}

		// Reset typing timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		typingTimeoutRef.current = setTimeout(() => {
			setIsTyping(false);
			socket.emit("typing", {
				chatId: chat._id,
				username: user.username,
				isTyping: false,
			});
		}, 2000);
	};

	const handleSend = (e) => {
		e.preventDefault();
		if (!inputText.trim()) return;

		onSendMessage(inputText.trim());
		setInputText("");
		setShowEmojiPicker(false);

		// Clear typing timeout and emit stopped typing immediately
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}
		setIsTyping(false);
		socket.emit("typing", {
			chatId: chat._id,
			username: user.username,
			isTyping: false,
		});
	};

	if (!chat) {
		return (
			<div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] chat-bg-pattern text-center p-6 border-b border-wa-teal/10 animate-fade-in">
				<div className="max-w-md space-y-4">
					<div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#111b21] p-4 text-wa-teal">
						<svg viewBox="0 0 24 24" className="h-16 w-16 fill-current">
							<path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.62-1.02-5.1-2.9-6.98A9.82 9.82 0 0012.04 2zm.08 18.25c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 01-1.25-4.38c0-4.51 3.67-8.19 8.19-8.19a8.12 8.12 0 015.79 2.4c1.55 1.55 2.4 3.61 2.4 5.79 0 4.52-3.67 8.2-8.19 8.2l-.25-.01z" />
						</svg>
					</div>
					<h2 className="text-xl font-bold text-white tracking-wide font-sans">
						WhatsApp Web
					</h2>
					<p className="text-sm text-wa-text-secondary font-sans">
						Send and receive messages in real time. Create groups, chat with
						contacts, and see typing indicators instantly.
					</p>
					<div className="pt-2">
						<span className="inline-block rounded-full bg-[#111b21] px-4 py-1.5 text-xs text-wa-text-secondary font-medium tracking-wide font-sans">
							🔒 End-to-end simulated encryption
						</span>
					</div>
				</div>
			</div>
		);
	}

	const isGroup = chat.type === "group";
	const otherParticipant = !isGroup
		? chat.participants.find((p) => p._id !== user.id)
		: null;

	const chatName = isGroup
		? chat.groupName
		: otherParticipant
			? otherParticipant.username
			: "Direct Chat";
	const chatAvatar = isGroup
		? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(chat.groupName)}`
		: otherParticipant
			? otherParticipant.avatar
			: "https://api.dicebear.com/7.x/bottts/svg";

	// Generate sub-header details
	const getSubtext = () => {
		if (typingUser) {
			return (
				<span className="text-wa-teal font-medium flex items-center gap-1 font-sans">
					{typingUser} is typing
					<span className="flex items-center gap-0.5 mt-0.5 shrink-0">
						<span className="h-1.25 w-1.25 rounded-full bg-wa-teal dot-bounce dot-bounce-1"></span>
						<span className="h-1.25 w-1.25 rounded-full bg-wa-teal dot-bounce dot-bounce-2"></span>
						<span className="h-1.25 w-1.25 rounded-full bg-wa-teal dot-bounce dot-bounce-3"></span>
					</span>
				</span>
			);
		}
		if (isGroup) {
			const names = chat.participants
				.map((p) => (p._id === user.id ? "You" : p.username))
				.join(", ");
			return (
				<span className="truncate block max-w-[200px] sm:max-w-[400px] font-sans">
					{names}
				</span>
			);
		}
		const isOnline = otherParticipant
			? onlineUsers.has(otherParticipant._id)
			: false;
		return isOnline ? "online" : "offline";
	};

	const formatMessageTime = (dateStr) => {
		return new Date(dateStr).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="flex flex-1 flex-col bg-[#0b141a] chat-bg-pattern border-b border-wa-teal/5 relative overflow-hidden h-full">
			{/* Header bar */}
			<div className="flex items-center justify-between bg-[#202c33] px-4 py-2 border-b border-white/5 text-white shrink-0 select-none">
				<div className="flex items-center gap-2 min-w-0">
					{onBack && (
						<button
							onClick={onBack}
							className="md:hidden p-1.5 -ml-1 text-wa-text-secondary hover:text-white rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer shrink-0"
							type="button"
							title="Back to chats"
						>
							<ArrowLeft className="h-5.5 w-5.5" />
						</button>
					)}
					<div
						className="flex items-center gap-3 cursor-pointer min-w-0"
						onClick={onToggleInfo}
					>
						<img
							src={chatAvatar}
							alt={chatName}
							className="h-10 w-10 rounded-full border border-white/5 bg-[#111b21] shrink-0"
						/>
						<div className="min-w-0">
							<h3 className="text-sm font-semibold leading-tight truncate font-sans">
								{chatName}
							</h3>
							<p className="text-[11px] text-wa-text-secondary truncate leading-tight mt-0.5 font-sans">
								{getSubtext()}
							</p>
						</div>
					</div>
				</div>

				{/* Right header buttons */}
				<div className="flex items-center gap-1.5 text-wa-text-secondary">
					<button
						className="rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
						title="Search Chat"
						type="button"
					>
						<Search className="h-4.5 w-4.5" />
					</button>
					<button
						className="rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
						onClick={onToggleInfo}
						title="Info"
						type="button"
					>
						<MoreVertical className="h-4.5 w-4.5" />
					</button>
				</div>
			</div>

			{/* Messages container */}
			<div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-3.5 flex flex-col">
				{messages.length === 0 ? (
					<div className="my-auto text-center py-10">
						<span className="inline-block bg-[#182229] border border-white/5 text-[11px] text-wa-text-secondary px-3 py-1 rounded-lg font-sans">
							Messages are real-time and saved in database.
						</span>
					</div>
				) : (
					messages.map((msg, index) => {
						const isMe = msg.senderId._id === user.id;
						return (
							<div
								key={msg._id || index}
								className={`flex flex-col max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm text-sm relative animate-fade-in ${
									isMe
										? "self-end bg-wa-outgoing text-white rounded-tr-none"
										: "self-start bg-wa-incoming text-white rounded-tl-none"
								}`}
							>
								{/* Username for incoming messages in group chats */}
								{!isMe && isGroup && (
									<span className="text-[11px] font-bold text-wa-teal mb-0.5 block font-sans">
										{msg.senderId.username}
									</span>
								)}

								{/* Message text */}
								<p className="pr-12 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap font-sans">
									{msg.content}
								</p>

								{/* Meta details (time + read status) */}
								<div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] text-[#8696a0] select-none font-sans">
									<span>{formatMessageTime(msg.createdAt)}</span>
									{isMe && <Check className="h-3 w-3 text-wa-teal shrink-0" />}
								</div>
							</div>
						);
					})
				)}
				{typingUser && (
					<div className="self-start bg-wa-incoming text-white rounded-lg rounded-tl-none px-3.5 py-1.5 shadow-sm animate-fade-in flex items-center gap-1.5 mb-1 shrink-0">
						<span className="text-[11.5px] font-bold text-wa-teal font-sans mr-0.5">{typingUser}</span>
						<span className="flex gap-0.5 items-center py-1.5 shrink-0">
							<span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] dot-bounce dot-bounce-1"></span>
							<span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] dot-bounce dot-bounce-2"></span>
							<span className="h-1.5 w-1.5 rounded-full bg-[#8696a0] dot-bounce dot-bounce-3"></span>
						</span>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input panel */}
			<div className="bg-[#202c33] px-4 py-2.5 flex items-center gap-3 shrink-0 relative">
				{showEmojiPicker && (
					<div className="absolute bottom-15 left-4 z-40 bg-[#111b21] border border-white/10 rounded-xl p-3.5 shadow-2xl w-64 glass animate-fade-in">
						<div className="grid grid-cols-6 gap-2">
							{EMOJIS.map((emoji) => (
								<button
									key={emoji}
									type="button"
									onClick={() => setInputText((prev) => prev + emoji)}
									className="text-xl p-1 hover:bg-white/5 rounded transition-all duration-100 active:scale-90 cursor-pointer"
								>
									{emoji}
								</button>
							))}
						</div>
					</div>
				)}

				<div className="flex items-center gap-1 text-wa-text-secondary">
					<button
						className={`rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors cursor-pointer ${
							showEmojiPicker ? "text-wa-teal bg-white/5" : ""
						}`}
						title="Emojis"
						type="button"
						onClick={() => setShowEmojiPicker(!showEmojiPicker)}
					>
						<Smile className="h-5.5 w-5.5" />
					</button>
					<button
						className="rounded-lg p-2 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
						title="Attach file"
						type="button"
					>
						<Paperclip className="h-5.5 w-5.5" />
					</button>
				</div>

				{/* Input box */}
				<form onSubmit={handleSend} className="flex-1 flex items-center gap-3">
					<input
						type="text"
						value={inputText}
						onChange={handleInputChange}
						placeholder="Type a message"
						className="flex-1 rounded-lg bg-[#2a3942] py-2 px-4 text-sm text-white placeholder-wa-text-secondary focus:outline-none border border-transparent focus:border-wa-teal/20 transition-all font-sans"
					/>
					<button
						type="submit"
						disabled={!inputText.trim()}
						className="flex h-9 w-9 items-center justify-center rounded-full bg-wa-teal text-[#111b21] hover:bg-[#00c298] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none shrink-0 cursor-pointer"
					>
						<Send className="h-4 w-4 fill-current pl-0.5" />
					</button>
				</form>
			</div>
		</div>
	);
}
