import React from 'react';
import { X, Info, Users, User, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function InfoSidebar({ chat, onClose }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  if (!chat) return null;

  const isGroup = chat.type === 'group';

  // Find info of the other user in one-to-one
  const otherUser = !isGroup
    ? chat.participants.find((p) => p._id !== user.id)
    : null;

  const title = isGroup ? chat.groupName : (otherUser ? otherUser.username : 'Chat Info');
  const avatar = isGroup
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(chat.groupName)}`
    : (otherUser ? otherUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg');

  return (
    <div className="h-full w-80 bg-[#111b21] border-l border-white/5 flex flex-col animate-fade-in shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#202c33] px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-wa-teal" />
          <span className="font-bold text-sm font-sans">Contact Info</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-wa-text-secondary hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body Details */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col items-center text-center">
          <img
            src={avatar}
            alt={title}
            className="h-24 w-24 rounded-full border-2 border-white/10 bg-[#202c33] shadow-md p-1 mb-4"
          />
          <h3 className="text-lg font-bold text-white leading-tight truncate w-full px-2 font-sans">
            {title}
          </h3>
          <span className="mt-1 text-xs text-wa-text-secondary uppercase tracking-wider font-semibold font-sans">
            {isGroup ? 'Group Chat' : 'Direct Message'}
          </span>
        </div>

        {/* Info Block */}
        <div className="bg-[#202c33]/30 rounded-xl p-4 border border-white/5 space-y-3.5">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-wa-teal shrink-0" />
            <span className="text-wa-text-secondary font-sans">
              Created {new Date(chat.createdAt).toLocaleDateString()}
            </span>
          </div>

          {!isGroup && otherUser && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-wa-teal shrink-0" />
              <span className="text-white truncate font-sans" title={otherUser.email}>
                {otherUser.email}
              </span>
            </div>
          )}
        </div>

        {/* Participants (MEMBER LIST) */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-wa-text-secondary font-sans">
            <span>Participants ({chat.participants.length})</span>
            <Users className="h-4 w-4" />
          </div>

          <div className="bg-[#202c33]/20 rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {chat.participants.map((member) => {
              const isMemberOnline = onlineUsers.has(member._id);
              const isMe = member._id === user.id;
              const isAdmin = isGroup && chat.groupAdmin && chat.groupAdmin._id === member._id;

              return (
                <div key={member._id} className="flex items-center gap-3 p-3 hover:bg-[#202c33]/10">
                  <div className="relative shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="h-8 w-8 rounded-full border border-white/5 bg-[#202c33]"
                    />
                    {isMemberOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-wa-teal border border-[#111b21]"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate font-sans">
                        {member.username} {isMe && '(You)'}
                      </span>
                      {isAdmin && (
                        <span className="text-[9px] bg-wa-teal/20 text-wa-teal border border-wa-teal/30 rounded px-1 font-semibold uppercase font-sans">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-wa-text-secondary truncate block font-sans">
                      {isMemberOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
