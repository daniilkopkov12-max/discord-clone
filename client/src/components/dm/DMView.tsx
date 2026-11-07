import React, { useState, useEffect } from 'react';
import { DMConversation, Message, User } from '../../types';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../context/WebRTCContext';
import { useModal } from '../../context/ModalContext';
import { UserControls } from '../layout/UserControls';
import { FriendsTab } from './FriendsTab';
import { MessageList } from '../chat/MessageList';
import { MessageInput } from '../chat/MessageInput';
import { VideoGrid } from '../voice/VideoGrid';
import { CallControls } from '../voice/CallControls';
import {
  Users,
  Plus,
  Phone,
  Video,
  Search,
  AtSign,
  UserPlus,
  Wifi,
} from 'lucide-react';

export const DMView: React.FC = () => {
  const { user } = useAuth();
  const { socket, onlineUsers, typingUsers } = useSocket();
  const {
    activeConversationCallId,
    startDirectCall,
    participants,
    remoteStreams,
    localStream,
  } = useWebRTC();
  const { openModal } = useModal();

  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Load DM conversations
  const loadConversations = async () => {
    try {
      const list = await api.get<DMConversation[]>('/api/dm');
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // When active conversation changes, load messages and join DM socket room
  useEffect(() => {
    if (!activeConversationId) return;

    const loadMessages = async () => {
      try {
        const msgs = await api.get<Message[]>(`/api/dm/${activeConversationId}/messages`);
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };

    loadMessages();

    if (socket) {
      socket.emit('dm:join', activeConversationId);
    }

    return () => {
      if (socket) {
        socket.emit('dm:leave', activeConversationId);
      }
    };
  }, [activeConversationId, socket]);

  // Real-time message events for DMs
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.dmConversationId === activeConversationId) {
        setMessages((prev) => [...prev, newMsg]);
      }
      loadConversations();
    };

    const handleMessageUpdate = (updatedMsg: Message) => {
      if (updatedMsg.dmConversationId === activeConversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleReactionUpdate = ({ messageId, emoji, userId, action, reaction }: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = m.reactions || [];
          if (action === 'added') {
            return { ...m, reactions: [...currentReactions, reaction] };
          } else {
            return {
              ...m,
              reactions: currentReactions.filter(
                (r) => !(r.userId === userId && r.emoji === emoji)
              ),
            };
          }
        })
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:update', handleMessageUpdate);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reaction_update', handleReactionUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:update', handleMessageUpdate);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reaction_update', handleReactionUpdate);
    };
  }, [socket, activeConversationId]);

  // Open 1-on-1 DM with a user
  const handleOpenDMWithUser = async (targetUserId: string) => {
    try {
      const conv = await api.post<DMConversation>(`/api/dm/user/${targetUserId}`);
      setConversations((prev) => {
        if (prev.some((c) => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setActiveConversationId(conv.id);
    } catch (err: any) {
      alert(err.message || 'Failed to open DM');
    }
  };

  // Send message
  const handleSendMessage = async (content: string, attachments?: any[], replyToId?: string) => {
    if (!activeConversationId) return;

    const newMsg = await api.post<Message>(`/api/dm/${activeConversationId}/messages`, {
      content,
      attachments,
      replyToId,
    });

    setMessages((prev) => [...prev, newMsg]);

    if (socket) {
      socket.emit('message:send', newMsg);
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string, content: string) => {
    const updated = await api.patch<Message>(`/api/messages/message/${messageId}`, {
      content,
    });
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    if (socket) socket.emit('message:edit', updated);
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    await api.delete(`/api/messages/message/${messageId}`);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (socket) {
      socket.emit('message:delete', {
        messageId,
        dmConversationId: activeConversationId,
      });
    }
  };

  // Toggle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    const res = await api.post(`/api/messages/message/${messageId}/reactions`, { emoji });
    if (socket) {
      socket.emit('message:reaction', {
        ...res,
        dmConversationId: activeConversationId,
      });
    }
  };

  // Toggle pin
  const handlePin = async (messageId: string) => {
    const updated = await api.post<Message>(`/api/messages/message/${messageId}/pin`);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  };

  // Current active conversation object
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Other participant in 1-on-1 DM
  const otherMember = activeConversation?.members.find((m) => m.userId !== user?.id)?.user;

  // Typing users for current conversation
  const currentTypingUsers = typingUsers
    .filter((t) => t.conversationId === activeConversationId)
    .map((t) => t.username);

  const isInCall = activeConversationCallId === activeConversationId;

  return (
    <div className="flex-1 h-screen flex select-none overflow-hidden">
      {/* DM Sidebar (Channels replacement) */}
      <div className="w-60 h-screen bg-[#2B2D31] flex flex-col justify-between select-none flex-shrink-0 z-20 border-r border-[#1F2023]/40">
        {/* Search header */}
        <div className="p-3 border-b border-[#1F2023]">
          <button
            onClick={() => openModal('globalSearch')}
            className="w-full bg-[#1E1F22] hover:bg-[#111214] text-[#949BA4] text-xs px-2.5 py-1.5 rounded flex items-center justify-between transition-colors"
          >
            <span>Find or start a chat</span>
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DM List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {/* Friends button */}
          <button
            onClick={() => setActiveConversationId(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded font-medium text-sm transition-colors ${
              activeConversationId === null
                ? 'bg-[#404249] text-white'
                : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Friends</span>
          </button>

          {/* Section Header */}
          <div className="flex items-center justify-between px-2 pt-4 pb-1 text-[11px] font-bold text-[#949BA4] uppercase tracking-wider">
            <span>Direct Messages</span>
            <button
              onClick={() => {
                const username = prompt('Enter username to start a direct message:');
                if (username) {
                  api
                    .get<User[]>(`/api/users/search?q=${encodeURIComponent(username)}`)
                    .then((users) => {
                      if (users.length > 0) handleOpenDMWithUser(users[0].id);
                      else alert('User not found');
                    });
                }
              }}
              className="hover:text-white transition-colors"
              title="Create DM"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Conversations */}
          {conversations.map((conv) => {
            const partner = conv.members.find((m) => m.userId !== user?.id)?.user;
            const isOnline = partner ? onlineUsers.has(partner.id) || partner.status !== 'offline' : false;
            const isActive = activeConversationId === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded text-left transition-colors group ${
                  isActive
                    ? 'bg-[#404249] text-white'
                    : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      conv.iconUrl ||
                      partner?.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${partner?.username || 'user'}`
                    }
                    alt={conv.name || partner?.displayName || 'Chat'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  {!conv.isGroup && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#2B2D31] ${
                        isOnline ? 'bg-[#23A55A]' : 'bg-[#80848E]'
                      }`}
                    />
                  )}
                </div>

                <div className="overflow-hidden flex-1 leading-tight">
                  <div className="text-xs font-semibold truncate group-hover:text-white">
                    {conv.name || partner?.displayName || partner?.username || 'Direct Message'}
                  </div>
                  {conv.messages && conv.messages[0] && (
                    <div className="text-[10px] text-[#949BA4] truncate mt-0.5">
                      {conv.messages[0].content}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* User Controls */}
        <UserControls />
      </div>

      {/* Main Content Pane */}
      {activeConversationId === null ? (
        /* Friends Tab */
        <FriendsTab onOpenDM={handleOpenDMWithUser} />
      ) : (
        /* Active DM Chat & Call */
        <div className="flex-1 h-screen bg-[#313338] flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="h-12 border-b border-[#1F2023] px-6 flex items-center justify-between bg-[#313338] select-none">
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-[#80848E]" />
              <div>
                <span className="font-bold text-white text-sm">
                  {activeConversation?.name || otherMember?.displayName || otherMember?.username}
                </span>
                {otherMember?.customStatus && (
                  <span className="text-xs text-[#949BA4] ml-2">
                    {otherMember.customStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Direct Call & Video Buttons */}
            <div className="flex items-center gap-3 text-[#B5BAC1]">
              {otherMember && (
                <>
                  {/* Start Voice Call */}
                  <button
                    onClick={() =>
                      startDirectCall(activeConversationId, otherMember.id, 'voice')
                    }
                    className="p-1.5 rounded hover:bg-[#35373C] hover:text-discord-green transition-colors"
                    title="Start Voice Call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* Start Video Call */}
                  <button
                    onClick={() =>
                      startDirectCall(activeConversationId, otherMember.id, 'video')
                    }
                    className="p-1.5 rounded hover:bg-[#35373C] hover:text-discord-green transition-colors"
                    title="Start Video Call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </>
              )}

              <button
                onClick={() => openModal('globalSearch')}
                className="p-1.5 rounded hover:bg-[#35373C] hover:text-white transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Call Stage (if user is currently calling in this DM) */}
          {isInCall && (
            <div className="bg-[#111214] p-4 border-b border-[#232428] flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2 text-xs text-discord-green font-semibold">
                <Wifi className="w-4 h-4 animate-pulse" />
                <span>Call in progress</span>
              </div>
              <div className="w-full max-h-80">
                <VideoGrid
                  participants={participants}
                  remoteStreams={remoteStreams}
                  localStream={localStream}
                />
              </div>
              <CallControls />
            </div>
          )}

          {/* Messages list */}
          <MessageList
            messages={messages}
            channelName={
              activeConversation?.name ||
              otherMember?.displayName ||
              otherMember?.username ||
              'DM'
            }
            topic="This is the beginning of your direct message history."
            currentUser={user}
            typingUsernames={currentTypingUsers}
            onReply={(msg) => setReplyingTo(msg)}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onReaction={handleReaction}
            onPin={handlePin}
          />

          {/* Message Input */}
          <MessageInput
            channelName={otherMember?.displayName || otherMember?.username || 'User'}
            replyingTo={replyingTo}
            conversationId={activeConversationId}
            onSendMessage={handleSendMessage}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      )}
    </div>
  );
};
