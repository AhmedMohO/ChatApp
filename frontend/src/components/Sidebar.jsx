import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useUsers } from "../hooks/queries/useUser";
import { useCreateGroup } from "../hooks/mutations/useCreateGroup";
import {
	LogOut,
	MessageSquarePlus,
	Users,
	Search,
	MessageCircle,
	Check,
} from "lucide-react";

export default function Sidebar({
	chats,
	activeChat,
	onSelectChat,
	onOpenGroupModal,
}) {
	const { user, logout } = useAuth();
	const { onlineUsers } = useSocket();

	const renderStatus = (status) => {
		const s = status || "sent";
		if (s === "sent") {
			return <Check className="h-3.5 w-3.5 text-wa-text-secondary shrink-0" />;
		}
		if (s === "delivered") {
			return (
				<div className="relative flex items-center h-3.5 w-4 shrink-0">
					<Check className="h-3.5 w-3.5 text-wa-text-secondary absolute left-0" />
					<Check className="h-3.5 w-3.5 text-wa-text-secondary absolute left-1.5" />
				</div>
			);
		}
		if (s === "seen") {
			return (
				<div className="relative flex items-center h-3.5 w-4 shrink-0">
					<Check className="h-3.5 w-3.5 text-wa-teal-light absolute left-0" />
					<Check className="h-3.5 w-3.5 text-wa-teal-light absolute left-1.5" />
				</div>
			);
		}
		return <Check className="h-3.5 w-3.5 text-wa-text-secondary shrink-0" />;
	};
	const [searchQuery, setSearchQuery] = useState("");
	const [showUserList, setShowUserList] = useState(false);
	const [activeTab, setActiveTab] = useState("all");

	// Fetch all users using React Query
	const { data: allUsers = [] } = useUsers(showUserList);
	const createChatMutation = useCreateGroup();

	// Helper to format dates nicely like WhatsApp
	const formatTime = (dateStr) => {
		if (!dateStr) return "";
		const date = new Date(dateStr);
		const now = new Date();

		// Check if today
		if (date.toDateString() === now.toDateString()) {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		}

		// Check if yesterday
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) {
			return "Yesterday";
		}

		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	};

	// Helper to find details of the other participant in a private chat
	const getChatDetails = (chat) => {
		if (chat.type === "group") {
			return {
				name: chat.groupName,
				avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(chat.groupName)}`,
				isOnline: false,
			};
		}

		const otherParticipant = chat.participants.find((p) => p._id !== user.id);
		return {
			name: otherParticipant ? otherParticipant.username : "Deleted User",
			avatar: otherParticipant
				? otherParticipant.avatar
				: "https://api.dicebear.com/7.x/bottts/svg",
			isOnline: otherParticipant
				? onlineUsers.has(otherParticipant._id)
				: false,
		};
	};

	// Handle starting a private chat
	const handleStartPrivateChat = (recipientId) => {
		createChatMutation.mutate(
			{
				type: "private",
				recipientId,
			},
			{
				onSuccess: (newChat) => {
					onSelectChat(newChat);
					setShowUserList(false);
					setSearchQuery("");
				},
				onError: (err) => {
					console.error("Error starting private chat:", err);
				}
			}
		);
	};

	// Filter existing chats based on query and active tab
	const filteredChats = chats.filter((chat) => {
		const details = getChatDetails(chat);
		const matchesSearch = details.name.toLowerCase().includes(searchQuery.toLowerCase());
		
		if (!matchesSearch) return false;
		
		if (activeTab === "direct") {
			return chat.type === "private";
		}
		if (activeTab === "group") {
			return chat.type === "group";
		}
		return true;
	});

	// Filter search-matched users
	const filteredUsers = allUsers.filter((u) =>
		u.username.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="flex h-full w-full flex-col bg-[#111b21] border-r border-white/5 md:w-[380px] lg:w-[420px] shrink-0">
			{/* Current User Header */}
			<div className="flex items-center justify-between bg-[#202c33] px-4 py-3 text-white">
				<div className="flex items-center gap-3">
					<img
						src={user.avatar}
						alt={user.username}
						className="h-10 w-10 rounded-full border border-white/10 bg-[#111b21] p-0.5 object-cover"
					/>
					<div>
						<h4 className="text-sm font-semibold leading-tight font-sans">
							{user.username}
						</h4>
						<span className="text-[10px] text-wa-teal font-medium tracking-wide uppercase font-sans">
							Online
						</span>
					</div>
				</div>

				{/* Action Controls */}
				<div className="flex items-center gap-1">
					<button
						onClick={() => setShowUserList(!showUserList)}
						className={`rounded-lg p-2 text-wa-text-secondary hover:bg-white/5 hover:text-white transition-all ${
							showUserList ? "bg-white/5 text-wa-teal" : ""
						}`}
						title={showUserList ? "Back to Chats" : "New Direct Chat"}>
						{showUserList ? (
							<MessageCircle className="h-5 w-5" />
						) : (
							<MessageSquarePlus className="h-5 w-5" />
						)}
					</button>

					<button
						onClick={onOpenGroupModal}
						className="rounded-lg p-2 text-wa-text-secondary hover:bg-white/5 hover:text-white transition-all"
						title="Create Group Chat">
						<Users className="h-5 w-5" />
					</button>

					<button
						onClick={logout}
						className="rounded-lg p-2 text-wa-text-secondary hover:bg-white/5 hover:text-red-400 transition-all"
						title="Sign Out">
						<LogOut className="h-5 w-5" />
					</button>
				</div>
			</div>

			{/* Search Input */}
			<div className="px-3 py-2 bg-[#111b21]">
				<div className="relative flex items-center rounded-lg bg-[#202c33] px-3 py-1.5 border border-transparent focus-within:border-wa-teal/50 transition-all duration-200">
					<Search className="h-4 w-4 text-wa-text-secondary mr-3" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={
							showUserList
								? "Search users to chat..."
								: "Search or start new chat"
						}
						className="w-full bg-transparent text-sm text-white placeholder-wa-text-secondary focus:outline-none"
					/>
				</div>
			</div>

			{/* Filter Tabs */}
			{!showUserList && (
				<div className="flex gap-2 px-3 pb-3 pt-1 bg-[#111b21] transition-all duration-200 border-b border-white/5">
					<button
						onClick={() => setActiveTab("all")}
						className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-sans cursor-pointer transition-all duration-200 select-none ${
							activeTab === "all"
								? "bg-wa-teal text-[#111b21] shadow-md shadow-wa-teal/10 scale-105"
								: "bg-[#202c33] text-wa-text-secondary hover:bg-white/5 hover:text-white"
						}`}
					>
						All
					</button>
					<button
						onClick={() => setActiveTab("direct")}
						className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-sans cursor-pointer transition-all duration-200 select-none ${
							activeTab === "direct"
								? "bg-wa-teal text-[#111b21] shadow-md shadow-wa-teal/10 scale-105"
								: "bg-[#202c33] text-wa-text-secondary hover:bg-white/5 hover:text-white"
						}`}
					>
						Chats
					</button>
					<button
						onClick={() => setActiveTab("group")}
						className={`px-3.5 py-1.5 rounded-full text-xs font-semibold font-sans cursor-pointer transition-all duration-200 select-none ${
							activeTab === "group"
								? "bg-wa-teal text-[#111b21] shadow-md shadow-wa-teal/10 scale-105"
								: "bg-[#202c33] text-wa-text-secondary hover:bg-white/5 hover:text-white"
						}`}
					>
						Groups
					</button>
				</div>
			)}

			{/* Conversations or User Discovery list */}
			<div className="flex-1 overflow-y-auto divide-y divide-white/5">
				{showUserList ? (
					<div>
						<div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-wa-text-secondary bg-[#202c33]/20 font-sans">
							Select Contact to Message
						</div>
						{filteredUsers.length === 0 ? (
							<div className="p-8 text-center text-sm text-wa-text-secondary">
								No contacts match search
							</div>
						) : (
							filteredUsers.map((item) => {
								const isOnline = onlineUsers.has(item._id);
								return (
									<div
										key={item._id}
										onClick={() => handleStartPrivateChat(item._id)}
										className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-wa-panel/30 transition-colors">
										<div className="relative">
											<img
												src={item.avatar}
												alt={item.username}
												className="h-12 w-12 rounded-full border border-white/5 bg-[#202c33]"
											/>
											{isOnline && (
												<div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-wa-teal border-2 border-[#111b21]"></div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="text-sm font-semibold text-white truncate">
												{item.username}
											</h4>
											<p className="text-xs text-wa-text-secondary truncate">
												{item.email}
											</p>
										</div>
									</div>
								);
							})
						)}
					</div>
				) : (
					<div>
						{filteredChats.length === 0 ? (
							<div className="p-10 text-center text-sm text-wa-text-secondary flex flex-col items-center gap-3">
								<MessageCircle className="h-10 w-10 text-[#202c33]" />
								<span>
									No active chats. Click the bubble icon above to start
									chatting!
								</span>
							</div>
						) : (
							filteredChats.map((chat) => {
								const isActive = activeChat && activeChat._id === chat._id;
								const details = getChatDetails(chat);
								const lastMsg = chat.lastMessage;

								return (
									<div
										key={chat._id}
										onClick={() => onSelectChat(chat)}
										className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
											isActive ? "bg-[#2a3942]" : "hover:bg-[#202c33]/45"
										}`}>
										{/* Avatar with potential online status */}
										<div className="relative shrink-0">
											<img
												src={details.avatar}
												alt={details.name}
												className="h-12 w-12 rounded-full border border-white/5 bg-[#202c33]"
											/>
											{details.isOnline && (
												<div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-wa-teal border-2 border-[#111b21]"></div>
											)}
										</div>

										{/* Meta info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-0.5">
												<h4 className="text-sm font-semibold text-white truncate mr-2 font-sans">
													{details.name}
												</h4>
												<span className="text-[10px] text-wa-text-secondary shrink-0 font-medium font-sans">
													{lastMsg
														? formatTime(lastMsg.createdAt)
														: formatTime(chat.createdAt)}
												</span>
											</div>

											{/* Message preview */}
											<p className="text-xs text-wa-text-secondary truncate flex items-center gap-1">
												{lastMsg ? (
													<>
														<span className="text-white/40 mr-1 font-sans shrink-0">
															{lastMsg.senderId._id === user.id
																? "You:"
																: `${lastMsg.senderId.username}:`}
														</span>
														{lastMsg.senderId._id === user.id && (
															<span className="shrink-0 inline-flex mr-0.5">
																{renderStatus(lastMsg.status)}
															</span>
														)}
														<span className="truncate">{lastMsg.content}</span>
													</>
												) : (
													<span className="italic text-white/30 text-[11px] font-sans">
														No messages yet
													</span>
												)}
											</p>
										</div>
									</div>
								);
							})
						)}
					</div>
				)}
			</div>
		</div>
	);
}
