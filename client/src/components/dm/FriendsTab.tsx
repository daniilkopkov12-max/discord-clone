import React, { useState, useEffect } from 'react';
import { Friendship, User } from '../../types';
import { api } from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  MessageSquare,
  Phone,
  Video,
  Check,
  X,
  UserPlus,
  Search,
} from 'lucide-react';

interface FriendsTabProps {
  onOpenDM: (targetUserId: string) => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({ onOpenDM }) => {
  const { onlineUsers } = useSocket();
  const { startDirectCall } = useWebRTC();
  const { openModal } = useModal();

  const [activeSubTab, setActiveSubTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [addUsername, setAddUsername] = useState('');
  const [addStatus, setAddStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFriends = async () => {
    try {
      const list = await api.get<Friendship[]>('/api/users/friends/list');
      setFriends(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setAddStatus(null);
    setIsLoading(true);

    try {
      const res = await api.post('/api/users/friends/request', {
        username: addUsername.trim(),
      });
      setAddStatus({ success: res.message || 'Friend request sent!' });
      setAddUsername('');
      loadFriends();
    } catch (err: any) {
      setAddStatus({ error: err.message || 'Failed to send friend request' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await api.post(`/api/users/friends/${friendshipId}/accept`);
      loadFriends();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      await api.delete(`/api/users/friends/${friendshipId}`);
      loadFriends();
    } catch (err: any) {
      alert(err.message || 'Failed to remove friend request');
    }
  };

  // Filter friends
  const acceptedFriends = friends.filter((f) => f.status === 'ACCEPTED');
  const pendingFriends = friends.filter((f) => f.status === 'PENDING');

  const filteredOnline = acceptedFriends.filter((f) => {
    const isOnline = onlineUsers.has(f.user.id) || f.user.status !== 'offline';
    const matchesSearch =
      f.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.user.username.toLowerCase().includes(searchQuery.toLowerCase());
    return isOnline && matchesSearch;
  });

  const filteredAll = acceptedFriends.filter((f) => {
    return (
      f.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex-1 h-screen bg-[#313338] flex flex-col select-none overflow-hidden">
      {/* Top Header with Tabs */}
      <div className="h-12 border-b border-[#1F2023] px-6 flex items-center justify-between bg-[#313338]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-r border-[#3F4147] pr-4">
            <Users className="w-5 h-5 text-[#80848E]" />
            <span>Friends</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              onClick={() => setActiveSubTab('online')}
              className={`px-2 py-1 rounded transition-colors ${
                activeSubTab === 'online'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              Online ({filteredOnline.length})
            </button>

            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-2 py-1 rounded transition-colors ${
                activeSubTab === 'all'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              All ({acceptedFriends.length})
            </button>

            <button
              onClick={() => setActiveSubTab('pending')}
              className={`px-2 py-1 rounded transition-colors relative ${
                activeSubTab === 'pending'
                  ? 'bg-[#404249] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              Pending
              {pendingFriends.length > 0 && (
                <span className="ml-1.5 bg-[#ED4245] text-white rounded-full text-[10px] px-1.5 py-0.2">
                  {pendingFriends.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('add')}
              className={`px-2 py-1 rounded transition-colors font-semibold ${
                activeSubTab === 'add'
                  ? 'bg-transparent text-discord-green'
                  : 'bg-discord-green hover:bg-emerald-600 text-white'
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ADD FRIEND TAB */}
        {activeSubTab === 'add' && (
          <div className="max-w-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Add Friend
            </h2>
            <p className="text-xs text-[#949BA4] mb-4">
              You can add friends with their Discord username. Try adding{' '}
              <span className="text-white font-semibold">alexdev</span> or{' '}
              <span className="text-white font-semibold">sarahtech</span>!
            </p>

            <form
              onSubmit={handleSendFriendRequest}
              className="bg-[#1E1F22] border border-[#232428] rounded-lg p-3 flex items-center gap-3 focus-within:border-discord-blurple transition-colors"
            >
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Enter a Username"
                className="bg-transparent flex-1 text-sm text-white focus:outline-none placeholder-[#80848E]"
              />
              <button
                type="submit"
                disabled={isLoading || !addUsername.trim()}
                className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-40"
              >
                Send Friend Request
              </button>
            </form>

            {addStatus?.success && (
              <div className="mt-3 text-xs text-discord-green font-medium">
                {addStatus.success}
              </div>
            )}
            {addStatus?.error && (
              <div className="mt-3 text-xs text-[#ED4245] font-medium">
                {addStatus.error}
              </div>
            )}
          </div>
        )}

        {/* ONLINE & ALL TABS */}
        {(activeSubTab === 'online' || activeSubTab === 'all') && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends"
                className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2 pl-9 text-xs text-white focus:outline-none focus:border-discord-blurple"
              />
              <Search className="w-4 h-4 text-[#80848E] absolute left-3 top-2.5" />
            </div>

            <div className="text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">
              {activeSubTab === 'online'
                ? `Online — ${filteredOnline.length}`
                : `All Friends — ${filteredAll.length}`}
            </div>

            <div className="divide-y divide-[#35363C]/40">
              {(activeSubTab === 'online' ? filteredOnline : filteredAll).map((f) => {
                const isOnline = onlineUsers.has(f.user.id) || f.user.status !== 'offline';

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#35373C]/60 group transition-colors"
                  >
                    <div
                      onClick={() => openModal('userProfile', { user: f.user, userId: f.user.id })}
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div className="relative">
                        <img
                          src={
                            f.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${f.user.username}`
                          }
                          alt={f.user.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#313338] ${
                            isOnline ? 'bg-[#23A55A]' : 'bg-[#80848E]'
                          }`}
                        />
                      </div>

                      <div className="overflow-hidden">
                        <div className="font-semibold text-sm text-white group-hover:text-discord-blurple">
                          {f.user.displayName || f.user.username}
                        </div>
                        <div className="text-xs text-[#949BA4] truncate">
                          {f.user.customStatus || (isOnline ? 'Online' : 'Offline')}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Message */}
                      <button
                        onClick={() => onOpenDM(f.user.id)}
                        className="w-9 h-9 rounded-full bg-[#2B2D31] hover:bg-[#1E1F22] text-[#B5BAC1] hover:text-white flex items-center justify-center transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {/* Direct Voice Call */}
                      <button
                        onClick={() => {
                          onOpenDM(f.user.id);
                        }}
                        className="w-9 h-9 rounded-full bg-[#2B2D31] hover:bg-[#1E1F22] text-[#B5BAC1] hover:text-discord-green flex items-center justify-center transition-colors"
                        title="Start Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {(activeSubTab === 'online' ? filteredOnline : filteredAll).length === 0 && (
              <div className="text-center py-12 text-[#949BA4] text-xs">
                No friends found here. Click "Add Friend" above to connect!
              </div>
            )}
          </div>
        )}

        {/* PENDING TAB */}
        {activeSubTab === 'pending' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2">
              Pending Requests — {pendingFriends.length}
            </div>

            <div className="divide-y divide-[#35363C]/40">
              {pendingFriends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[#35373C]/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        f.user.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${f.user.username}`
                      }
                      alt={f.user.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-sm text-white">
                        {f.user.displayName || f.user.username}
                      </div>
                      <div className="text-xs text-[#949BA4]">
                        {f.isOutgoing ? 'Outgoing Friend Request' : 'Incoming Friend Request'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!f.isOutgoing && (
                      <button
                        onClick={() => handleAcceptRequest(f.id)}
                        className="w-9 h-9 rounded-full bg-[#2B2D31] hover:bg-discord-green text-[#B5BAC1] hover:text-white flex items-center justify-center transition-colors"
                        title="Accept"
                      >
                        <Check className="w-5 h-5 text-discord-green hover:text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeclineRequest(f.id)}
                      className="w-9 h-9 rounded-full bg-[#2B2D31] hover:bg-[#ED4245] text-[#B5BAC1] hover:text-white flex items-center justify-center transition-colors"
                      title={f.isOutgoing ? 'Cancel Request' : 'Decline'}
                    >
                      <X className="w-5 h-5 text-[#ED4245] hover:text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pendingFriends.length === 0 && (
              <div className="text-center py-12 text-[#949BA4] text-xs">
                There are no pending friend requests.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
