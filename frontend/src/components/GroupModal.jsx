import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users, Loader2 } from 'lucide-react';
import { useUsers } from '../hooks/queries/useUser';
import { useCreateGroup } from '../hooks/mutations/useCreateGroup';

export default function GroupModal({ isOpen, onClose, onChatCreated }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // Queries & Mutations
  const { data: users = [], isLoading: loading } = useUsers(isOpen);
  const createGroupMutation = useCreateGroup();

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state
    setGroupName('');
    setSelectedUsers(new Set());
    setSearchQuery('');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUser = (userId) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUsers.size === 0) {
      setError('Please select at least one participant.');
      return;
    }

    setError('');
    createGroupMutation.mutate(
      {
        type: 'group',
        groupName: groupName.trim(),
        participants: Array.from(selectedUsers)
      },
      {
        onSuccess: (newChat) => {
          onChatCreated(newChat);
          onClose();
        },
        onError: (err) => {
          console.error('Error creating group:', err);
          setError(err.message || 'Failed to create group chat.');
        }
      }
    );
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submitting = createGroupMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#222e35] shadow-2xl border border-white/5 animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#111b21] px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-wa-teal" />
            <h3 className="font-bold text-lg font-sans">Create New Group</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-wa-text-secondary hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-hidden flex flex-col p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Group Name input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-2">
              Group Subject
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Family Chat 🚀"
              className="w-full rounded-lg bg-[#111b21] py-2.5 px-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all"
              required
            />
          </div>

          {/* Search Users */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-2">
              Select Participants ({selectedUsers.size})
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-text-secondary">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg bg-[#111b21] py-2 pl-9 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Users Selection List */}
          <div className="flex-1 overflow-y-auto mb-6 bg-[#111b21] rounded-lg border border-white/5 divide-y divide-white/5 max-h-[250px]">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-wa-text-secondary">
                <Loader2 className="h-6 w-6 animate-spin text-wa-teal" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-wa-text-secondary">
                No users found
              </div>
            ) : (
              filteredUsers.map((item) => {
                const isSelected = selectedUsers.has(item._id);
                return (
                  <div
                    key={item._id}
                    onClick={() => toggleUser(item._id)}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-wa-active/50' : 'hover:bg-wa-active/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.avatar}
                        alt={item.username}
                        className="h-10 w-10 rounded-full border border-white/5 bg-[#202c33]"
                      />
                      <span className="text-sm font-medium text-white">{item.username}</span>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-wa-teal bg-wa-teal text-[#111b21]'
                          : 'border-wa-text-secondary'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Submit */}
          <div className="mt-auto pt-4 border-t border-white/5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/5 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedUsers.size === 0}
              className="flex-1 rounded-lg bg-wa-teal py-2.5 text-sm font-semibold text-[#111b21] hover:bg-[#00c298] disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all flex items-center justify-center"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
