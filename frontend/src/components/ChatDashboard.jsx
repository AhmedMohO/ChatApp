import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import InfoSidebar from './InfoSidebar';
import GroupModal from './GroupModal';
import { useQueryClient } from '@tanstack/react-query';
import { useChats, useChat } from '../hooks/queries/useChats';
import { useMessages } from '../hooks/queries/useMessages';
import { useSendMessage } from '../hooks/mutations/useSendMessage';

export default function ChatDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  
  const [activeChatId, setActiveChatId] = useState(null);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  // TanStack Queries & Mutations
  const { data: chats = [] } = useChats();
  const { data: activeChat } = useChat(activeChatId);
  const { data: messages = [] } = useMessages(activeChatId);
  const sendMessageMutation = useSendMessage();

  const activeChatIdRef = useRef(activeChatId);

  // Keep a ref to activeChatId so the socket listener always sees the current active chat
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Join/leave room on active chat change
  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    // Socket: Join the chat room
    if (socket) {
      socket.emit('join_chat', activeChatId);
    }

    // Reset typing status on chat change
    setTypingUser(null);

    return () => {
      if (socket) {
        socket.emit('leave_chat', activeChatId);
      }
    };
  }, [activeChatId, socket]);

  // Socket real-time event listeners updating React Query Cache
  useEffect(() => {
    if (!socket) return;

    // Listen for new incoming messages
    socket.on('receive_message', (message) => {
      // 1. Update the chat messages cache
      queryClient.setQueryData(['messages', message.chatId], (oldMessages) => {
        if (!oldMessages) return [message];
        if (oldMessages.some((m) => m._id === message._id)) return oldMessages;
        const cleanMessages = oldMessages.filter((m) => !m._id.startsWith('temp-'));
        return [...cleanMessages, message];
      });

      // 2. Update the corresponding chat preview in sidebar and re-sort
      queryClient.setQueryData(['chats'], (oldChats) => {
        if (!oldChats) return [];
        const chatExists = oldChats.some((c) => c._id === message.chatId);
        
        if (chatExists) {
          const updated = oldChats.map((c) => {
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
            return timeB.getTime() - timeA.getTime();
          });
        } else {
          // New chat dynamically created: refetch chats list
          queryClient.invalidateQueries({ queryKey: ['chats'] });
          return oldChats;
        }
      });
    });

    // Listen for typing events
    socket.on('user_typing', ({ chatId, username, isTyping }) => {
      if (chatId === activeChatIdRef.current) {
        setTypingUser(isTyping ? username : null);
      }
    });

    // Listen for message status updates
    socket.on('message_status_update', ({ chatId, messageIds, status }) => {
      // Update active chat's messages in cache if open
      queryClient.setQueryData(['messages', chatId], (oldMessages) => {
        if (!oldMessages) return [];
        return oldMessages.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, status } : msg
        );
      });

      // Also update the status of the last message in the sidebar chats cache
      queryClient.setQueryData(['chats'], (oldChats) => {
        if (!oldChats) return [];
        return oldChats.map((c) => {
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
        });
      });
    });

    // Listen for group membership additions
    socket.on('member_added', ({ chatId, chat, addedUser, membersInfo }) => {
      queryClient.setQueryData(['chats'], (oldChats) => {
        if (!oldChats) return [chat];
        const exists = oldChats.some((c) => c._id === chatId);
        if (!exists) {
          return [chat, ...oldChats];
        } else {
          return oldChats.map((c) => {
            if (c._id === chatId) {
              const updatedParticipants = c.participants.some((p) => p._id === addedUser._id)
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
    });

    // Listen for group membership removals
    socket.on('member_removed', ({ chatId, removedUserId }) => {
      if (removedUserId === user.id) {
        alert('You have been removed from the group.');
        if (activeChatIdRef.current === chatId) {
          setActiveChatId(null);
        }
        queryClient.setQueryData(['chats'], (oldChats) => {
          if (!oldChats) return [];
          return oldChats.filter((c) => c._id !== chatId);
        });
      } else {
        queryClient.setQueryData(['chats'], (oldChats) => {
          if (!oldChats) return [];
          return oldChats.map((c) => {
            if (c._id === chatId) {
              return {
                ...c,
                participants: c.participants.filter((p) => p._id !== removedUserId),
                membersInfo: c.membersInfo ? c.membersInfo.filter((m) => m.user._id !== removedUserId) : []
              };
            }
            return c;
          });
        });
      }
    });

    // Listen for group updates
    socket.on('group_updated', ({ chatId, groupName, groupDescription, groupAvatar, groupAdmin, membersInfo }) => {
      queryClient.setQueryData(['chats'], (oldChats) => {
        if (!oldChats) return [];
        return oldChats.map((c) => {
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
        });
      });
    });

    // Listen for group deletion
    socket.on('group_deleted', ({ chatId }) => {
      if (activeChatIdRef.current === chatId) {
        alert('This group has been deleted by the administrator.');
        setActiveChatId(null);
      }
      queryClient.setQueryData(['chats'], (oldChats) => {
        if (!oldChats) return [];
        return oldChats.filter((c) => c._id !== chatId);
      });
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('message_status_update');
      socket.off('member_added');
      socket.off('member_removed');
      socket.off('group_updated');
      socket.off('group_deleted');
    };
  }, [socket, user.id, queryClient]);

  // Callback when a user sends a message
  const handleSendMessage = (content) => {
    if (!activeChatId) return;
    sendMessageMutation.mutate({ chatId: activeChatId, content });
  };

  // Callback when group modal successfully creates a group chat
  const handleChatCreated = (newChat) => {
    setActiveChatId(newChat._id);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b141a] text-slate-100 font-sans">
      <div className="flex h-full w-full overflow-hidden relative">
        
        {/* Sidebar Panel */}
        <div className={`h-full w-full md:w-auto shrink-0 ${activeChat ? 'hidden md:block' : 'block'}`}>
          <Sidebar
            chats={chats}
            activeChat={activeChat}
            onSelectChat={(chat) => setActiveChatId(chat._id)}
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
            onBack={() => setActiveChatId(null)}
          />
        </div>

        {/* Contact Info Sidebar Panel */}
        {showInfoSidebar && activeChat && (
          <InfoSidebar
            chat={activeChat}
            onClose={() => setShowInfoSidebar(false)}
            onLeaveOrDelete={() => {
              setShowInfoSidebar(false);
              setActiveChatId(null);
            }}
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
