import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  Info,
  Users,
  User,
  Calendar,
  Edit2,
  Check,
  UserPlus,
  UserMinus,
  ShieldAlert,
  Save,
  Search,
  BookOpen
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function InfoSidebar({ chat, onClose }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Sync inputs on chat switch
  useEffect(() => {
    if (chat) {
      setGroupNameInput(chat.groupName || '');
      setGroupDescInput(chat.groupDescription || '');
      setGroupAvatarInput(chat.groupAvatar || '');
      setShowAddMember(false);
      setIsEditingName(false);
      setIsEditingDesc(false);
      setIsEditingAvatar(false);
    }
  }, [chat]);

  // Load all users when Add Member section is toggled
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/users`);
        setAllUsers(res.data);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    if (showAddMember) {
      fetchUsers();
    }
  }, [showAddMember]);

  if (!chat) return null;

  const isGroup = chat.type === 'group';

  // Check if current user is group owner
  const isOwner = isGroup && chat.groupAdmin && (
    chat.groupAdmin._id === user.id || chat.groupAdmin === user.id
  );

  // Find info of the other user in one-to-one
  const otherUser = !isGroup
    ? chat.participants.find((p) => p._id !== user.id)
    : null;

  const title = isGroup ? chat.groupName : (otherUser ? otherUser.username : 'Chat Info');
  const avatar = isGroup
    ? (chat.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(chat.groupName)}`)
    : (otherUser ? otherUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg');

  // Handle saving group info changes
  const handleUpdateGroupInfo = async () => {
    try {
      await axios.put(`${API_URL}/chats/${chat._id}`, {
        groupName: groupNameInput,
        groupDescription: groupDescInput,
        groupAvatar: groupAvatarInput
      });
      setIsEditingName(false);
      setIsEditingDesc(false);
      setIsEditingAvatar(false);
    } catch (err) {
      console.error('Failed to update group info:', err);
      alert(err.response?.data?.message || 'Failed to update group info');
    }
  };

  // Handle adding member
  const handleAddMember = async (targetUserId) => {
    try {
      await axios.post(`${API_URL}/chats/${chat._id}/members`, { userId: targetUserId });
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to add member:', err);
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  // Handle removing member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await axios.delete(`${API_URL}/chats/${chat._id}/members/${memberId}`);
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Handle transferring ownership
  const handleTransferOwnership = async (newOwnerId) => {
    if (!window.confirm('Are you sure you want to transfer group ownership? You will lose owner permissions.')) return;
    try {
      await axios.put(`${API_URL}/chats/${chat._id}/transfer-owner`, { newOwnerId });
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
      alert(err.response?.data?.message || 'Failed to transfer ownership');
    }
  };

  // Filter users to show only those not currently in group
  const filteredUsers = allUsers.filter((u) => {
    const isAlreadyMember = chat.participants.some((p) => p._id === u._id);
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadyMember && matchesSearch && u._id !== user.id;
  });

  return (
    <div className="h-full w-80 bg-[#111b21] border-l border-white/5 flex flex-col animate-fade-in shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#202c33] px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-wa-teal" />
          <span className="font-bold text-sm font-sans">{isGroup ? 'Group Info' : 'Contact Info'}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-wa-text-secondary hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body Details */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col items-center text-center relative group">
          {isEditingAvatar ? (
            <div className="w-full flex items-center gap-1.5 mb-4">
              <input
                type="text"
                value={groupAvatarInput}
                onChange={(e) => setGroupAvatarInput(e.target.value)}
                placeholder="Paste avatar URL"
                className="flex-1 text-xs rounded bg-[#202c33] px-2 py-1 text-white border border-transparent focus:border-wa-teal focus:outline-none"
              />
              <button
                onClick={handleUpdateGroupInfo}
                className="p-1 bg-wa-teal text-[#111b21] rounded hover:bg-[#00c298] cursor-pointer"
                title="Save Avatar"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setGroupAvatarInput(chat.groupAvatar || '');
                  setIsEditingAvatar(false);
                }}
                className="p-1 bg-white/5 text-wa-text-secondary rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <img
                src={avatar}
                alt={title}
                className="h-24 w-24 rounded-full border-2 border-white/10 bg-[#202c33] shadow-md p-1 mb-4 object-cover"
              />
              {isOwner && (
                <button
                  onClick={() => setIsEditingAvatar(true)}
                  className="absolute bottom-3 right-0 p-1.5 bg-wa-teal hover:bg-[#00c298] text-[#111b21] rounded-full shadow cursor-pointer transition-all active:scale-90"
                  title="Edit Group Image"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Group Name Display / Edit */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 w-full justify-center">
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                className="bg-[#202c33] text-sm font-semibold rounded px-2.5 py-1 text-white border border-transparent focus:border-wa-teal focus:outline-none text-center font-sans"
              />
              <button
                onClick={handleUpdateGroupInfo}
                className="p-1 bg-wa-teal text-[#111b21] rounded hover:bg-[#00c298] cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setGroupNameInput(chat.groupName);
                  setIsEditingName(false);
                }}
                className="p-1 bg-white/5 text-wa-text-secondary rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 max-w-full justify-center">
              <h3 className="text-base font-bold text-white leading-tight truncate font-sans">
                {title}
              </h3>
              {isOwner && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-wa-text-secondary hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Rename Group"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <span className="mt-1.5 text-[10px] text-wa-text-secondary uppercase tracking-wider font-semibold font-sans">
            {isGroup ? 'Group Chat' : 'Direct Message'}
          </span>
        </div>

        {/* Info Block (Created Date) */}
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

        {/* Group Description */}
        {isGroup && (
          <div className="bg-[#202c33]/30 rounded-xl p-4 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-wa-teal font-sans flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Description
              </span>
              {isOwner && !isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-wa-text-secondary hover:text-white cursor-pointer transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {isEditingDesc ? (
              <div className="space-y-1.5">
                <textarea
                  value={groupDescInput}
                  onChange={(e) => setGroupDescInput(e.target.value)}
                  placeholder="Describe your group..."
                  rows={2}
                  className="w-full text-xs bg-[#202c33] rounded p-2 text-white border border-transparent focus:border-wa-teal focus:outline-none font-sans resize-none"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => {
                      setGroupDescInput(chat.groupDescription || '');
                      setIsEditingDesc(false);
                    }}
                    className="px-2 py-1 text-[10px] text-wa-text-secondary hover:text-white rounded bg-white/5 cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateGroupInfo}
                    className="px-2.5 py-1 text-[10px] text-[#111b21] bg-wa-teal hover:bg-[#00c298] font-bold rounded flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Save className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-wa-text-secondary leading-relaxed font-sans whitespace-pre-wrap break-words">
                {chat.groupDescription || (
                  <span className="italic text-white/20">No description provided</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Add Members Section */}
        {isOwner && (
          <div>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full flex items-center justify-center gap-2 bg-wa-teal/10 border border-wa-teal/20 text-wa-teal text-xs py-2 px-4 rounded-xl font-semibold font-sans hover:bg-wa-teal/15 cursor-pointer active:scale-[0.98] transition-all"
            >
              <UserPlus className="h-4 w-4" />
              {showAddMember ? 'Close User Panel' : 'Add New Member'}
            </button>

            {showAddMember && (
              <div className="mt-3 bg-[#202c33]/20 border border-white/5 rounded-xl p-3 space-y-3 animate-fade-in">
                <div className="relative flex items-center rounded-lg bg-[#202c33] px-2.5 py-1.5 border border-transparent focus-within:border-wa-teal/50 transition-all duration-200">
                  <Search className="h-3.5 w-3.5 text-wa-text-secondary mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full bg-transparent text-xs text-white placeholder-wa-text-secondary focus:outline-none"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-wa-text-secondary font-sans">
                      No matching contacts
                    </div>
                  ) : (
                    filteredUsers.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleAddMember(item._id)}
                        className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 px-2 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.avatar}
                            alt={item.username}
                            className="h-7 w-7 rounded-full bg-[#202c33] border border-white/5"
                          />
                          <span className="text-xs text-white truncate font-sans">
                            {item.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-[10px] bg-wa-teal text-[#111b21] font-bold px-2 py-0.5 rounded opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer font-sans"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Participants (MEMBER LIST) */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-wa-text-secondary font-sans">
            <span>Members ({chat.participants.length})</span>
            <Users className="h-4 w-4" />
          </div>

          <div className="bg-[#202c33]/20 rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {chat.participants.map((member) => {
              const isMemberOnline = onlineUsers.has(member._id);
              const isMe = member._id === user.id;

              // Pull member data from membersInfo array if populated
              const memberInfo = chat.membersInfo
                ? chat.membersInfo.find((m) => (m.user && m.user._id === member._id) || m.user === member._id)
                : null;

              const role = memberInfo ? memberInfo.role : (chat.groupAdmin && (chat.groupAdmin._id === member._id || chat.groupAdmin === member._id) ? 'owner' : 'member');
              const joinedDate = memberInfo ? new Date(memberInfo.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

              const isUserAdmin = role === 'owner';

              return (
                <div key={member._id} className="flex items-center justify-between p-3 hover:bg-[#202c33]/10 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate font-sans">
                          {member.username} {isMe && '(You)'}
                        </span>
                        {isUserAdmin && (
                          <span className="text-[9px] bg-wa-teal/20 text-wa-teal border border-wa-teal/30 rounded px-1 font-semibold uppercase font-sans">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col text-[10px] text-wa-text-secondary leading-tight mt-0.5 font-sans">
                        <span>{isMemberOnline ? 'online' : 'offline'}</span>
                        {joinedDate && (
                          <span className="text-[9px] opacity-70 mt-0.5">Joined {joinedDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Group Owner */}
                  {isOwner && !isMe && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleTransferOwnership(member._id)}
                        className="p-1 hover:bg-wa-teal/20 text-wa-text-secondary hover:text-wa-teal rounded cursor-pointer transition-colors"
                        title="Make Group Owner"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="p-1 hover:bg-red-500/10 text-wa-text-secondary hover:text-red-400 rounded cursor-pointer transition-colors"
                        title="Remove Member"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
