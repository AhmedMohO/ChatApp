import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import InfoSidebar from './InfoSidebar';
import GroupModal from './GroupModal';
import { ArrowLeft } from 'lucide-react';

export default function ChatDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [typingUser, setTypingUser] = useState(null); // stores username of currently typing user in active chat

  const activeChatRef = useRef(activeChat);

  // Keep a ref to activeChat so the socket listener always sees the current active chat
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Fetch initial chat list
  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_URL}/chats`);
      setChats(res.data);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  // 2. Join/leave room and fetch message history on active chat change
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/messages/${activeChat._id}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    fetchMessages();

    // Socket: Join the chat room
    if (socket) {
      socket.emit('join_chat', activeChat._id);
    }

    // Reset typing status on chat change
    setTypingUser(null);

    return () => {
      if (socket) {
        socket.emit('leave_chat', activeChat._id);
      }
    };
  }, [activeChat, socket]);

  // 3. Socket real-time event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new incoming messages
    socket.on('receive_message', (message) => {
      const currentActiveChat = activeChatRef.current;
      
      // A. If message is for the currently open chat, append it to messages state
      if (currentActiveChat && message.chatId === currentActiveChat._id) {
        setMessages((prev) => {
          // Avoid duplicate appends
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }

      // B. Update the corresponding chat preview in sidebar and re-sort
      setChats((prevChats) => {
        const chatExists = prevChats.some((c) => c._id === message.chatId);
        
        if (chatExists) {
          const updated = prevChats.map((c) => {
            if (c._id === message.chatId) {
              return {
                ...c,
                lastMessage: message
              };
            }
            return c;
          });

          // Re-sort descending based on activity time
          return [...updated].sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt);
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt);
            return timeB - timeA;
          });
        } else {
          // New chat dynamically created: refetch chat list to display in sidebar
          fetchChats();
          return prevChats;
        }
      });
    });

    // Listen for typing events
    socket.on('user_typing', ({ chatId, username, isTyping }) => {
      const currentActiveChat = activeChatRef.current;
      if (currentActiveChat && chatId === currentActiveChat._id) {
        if (isTyping) {
          setTypingUser(username);
        } else {
          setTypingUser(null);
        }
      }
    });

    // Listen for message status updates
    socket.on('message_status_update', ({ chatId, messageIds, status }) => {
      const currentActiveChat = activeChatRef.current;
      
      // Update active chat's messages if open
      if (currentActiveChat && chatId === currentActiveChat._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg._id) ? { ...msg, status } : msg
          )
        );
      }

      // Also update the status of the last message in the sidebar
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c._id === chatId && c.lastMessage && messageIds.includes(c.lastMessage._id)) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status
              }
            };
          }
          return c;
        })
      );
    });

    // Listen for group membership additions
    socket.on('member_added', ({ chatId, chat, addedUser, membersInfo }) => {
      const currentActiveChat = activeChatRef.current;
      
      setChats((prevChats) => {
        const exists = prevChats.some(c => c._id === chatId);
        if (!exists) {
          return [chat, ...prevChats];
        } else {
          return prevChats.map((c) => {
            if (c._id === chatId) {
              const updatedParticipants = c.participants.some(p => p._id === addedUser._id)
                ? c.participants
                : [...c.participants, addedUser];
              return {
                ...c,
                participants: updatedParticipants,
                membersInfo
              };
            }
            return c;
          });
        }
      });

      if (currentActiveChat && chatId === currentActiveChat._id) {
        setActiveChat((prev) => {
          if (!prev) return null;
          const updatedParticipants = prev.participants.some(p => p._id === addedUser._id)
            ? prev.participants
            : [...prev.participants, addedUser];
          return {
            ...prev,
            participants: updatedParticipants,
            membersInfo
          };
        });
      }
    });

    // Listen for group membership removals
    socket.on('member_removed', ({ chatId, removedUserId }) => {
      const currentActiveChat = activeChatRef.current;
      
      if (removedUserId === user.id) {
        alert('You have been removed from the group.');
        if (currentActiveChat && currentActiveChat._id === chatId) {
          setActiveChat(null);
        }
        setChats((prevChats) => prevChats.filter(c => c._id !== chatId));
      } else {
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c._id === chatId) {
              return {
                ...c,
                participants: c.participants.filter(p => p._id !== removedUserId),
                membersInfo: c.membersInfo ? c.membersInfo.filter(m => m.user._id !== removedUserId) : []
              };
            }
            return c;
          })
        );

        if (currentActiveChat && chatId === currentActiveChat._id) {
          setActiveChat((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.filter(p => p._id !== removedUserId),
              membersInfo: prev.membersInfo ? prev.membersInfo.filter(m => m.user._id !== removedUserId) : []
            };
          });
        }
      }
    });

    // Listen for group updates
    socket.on('group_updated', ({ chatId, groupName, groupDescription, groupAvatar, groupAdmin, membersInfo }) => {
      const currentActiveChat = activeChatRef.current;

      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c._id === chatId) {
            return {
              ...c,
              groupName: groupName !== undefined ? groupName : c.groupName,
              groupDescription: groupDescription !== undefined ? groupDescription : c.groupDescription,
              groupAvatar: groupAvatar !== undefined ? groupAvatar : c.groupAvatar,
              groupAdmin: groupAdmin !== undefined ? groupAdmin : c.groupAdmin,
              membersInfo: membersInfo !== undefined ? membersInfo : c.membersInfo
            };
          }
          return c;
        })
      );

      if (currentActiveChat && chatId === currentActiveChat._id) {
        setActiveChat((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            groupName: groupName !== undefined ? groupName : prev.groupName,
            groupDescription: groupDescription !== undefined ? groupDescription : prev.groupDescription,
            groupAvatar: groupAvatar !== undefined ? groupAvatar : prev.groupAvatar,
            groupAdmin: groupAdmin !== undefined ? groupAdmin : prev.groupAdmin,
            membersInfo: membersInfo !== undefined ? membersInfo : prev.membersInfo
          };
        });
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('message_status_update');
      socket.off('member_added');
      socket.off('member_removed');
      socket.off('group_updated');
    };
  }, [socket]);

  // Callback when a user sends a message
  const handleSendMessage = (content) => {
    if (!socket || !activeChat) return;
    
    // Emit message event to server
    socket.emit('send_message', {
      chatId: activeChat._id,
      senderId: user.id,
      content
    });
  };

  // Callback when group modal successfully creates a group chat
  const handleChatCreated = (newChat) => {
    setChats((prev) => [newChat, ...prev]);
    setActiveChat(newChat);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b141a] text-slate-100 font-sans">
      <div className="flex h-full w-full overflow-hidden relative">
        
        {/* Sidebar Panel */}
        <div className={`h-full w-full md:w-auto shrink-0 ${activeChat ? 'hidden md:block' : 'block'}`}>
          <Sidebar
            chats={chats}
            activeChat={activeChat}
            onSelectChat={setActiveChat}
            onOpenGroupModal={() => setIsGroupModalOpen(true)}
          />
        </div>

        {/* Chat Area Panel */}
        <div className={`flex-1 h-full flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          <ChatArea
            chat={activeChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            onToggleInfo={() => setShowInfoSidebar(!showInfoSidebar)}
            typingUser={typingUser}
            onBack={() => setActiveChat(null)}
          />
        </div>

        {/* Contact Info Sidebar Panel */}
        {showInfoSidebar && activeChat && (
          <InfoSidebar
            chat={activeChat}
            onClose={() => setShowInfoSidebar(false)}
          />
        )}
      </div>

      {/* Group Create Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
}
