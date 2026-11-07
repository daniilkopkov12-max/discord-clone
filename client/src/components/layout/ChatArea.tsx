import React, { useState, useEffect } from 'react';
import { Channel, Message, User } from '../../types';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { MessageList } from '../chat/MessageList';
import { MessageInput } from '../chat/MessageInput';
import {
  Hash,
  Pin,
  Users,
  Search,
  Bell,
  Inbox,
  X,
} from 'lucide-react';

interface ChatAreaProps {
  channel: Channel;
  onToggleMembers: () => void;
  isMembersOpen: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  onToggleMembers,
  isMembersOpen,
}) => {
  const { user } = useAuth();
  const { socket, typingUsers } = useSocket();
  const { openModal } = useModal();

  const [messages, setMessages] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showPinsModal, setShowPinsModal] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

  // Load channel messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await api.get<Message[]>(`/api/messages/${channel.id}`);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();

    if (socket) {
      socket.emit('channel:join', channel.id);
    }

    return () => {
      if (socket) {
        socket.emit('channel:leave', channel.id);
      }
    };
  }, [channel.id, socket]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.channelId === channel.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const handleMessageUpdate = (updatedMsg: Message) => {
      if (updatedMsg.channelId === channel.id) {
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
  }, [socket, channel.id]);

  // Send message
  const handleSendMessage = async (content: string, attachments?: any[], replyToId?: string) => {
    const newMsg = await api.post<Message>(`/api/messages/${channel.id}`, {
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
      socket.emit('message:delete', { messageId, channelId: channel.id });
    }
  };

  // Toggle reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    const res = await api.post(`/api/messages/message/${messageId}/reactions`, { emoji });
    if (socket) {
      socket.emit('message:reaction', {
        ...res,
        channelId: channel.id,
      });
    }
  };

  // Toggle pin
  const handlePin = async (messageId: string) => {
    const updated = await api.post<Message>(`/api/messages/message/${messageId}/pin`);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
  };

  // Load pinned messages
  const loadPinnedMessages = async () => {
    try {
      const pins = await api.get<Message[]>(`/api/messages/${channel.id}/pins`);
      setPinnedMessages(pins);
      setShowPinsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const currentTypingUsers = typingUsers
    .filter((t) => t.channelId === channel.id)
    .map((t) => t.username);

  return (
    <main className="flex-1 h-screen bg-[#313338] flex flex-col justify-between overflow-hidden relative">
      {/* Channel Header */}
      <div className="h-12 border-b border-[#1F2023] px-6 flex items-center justify-between select-none bg-[#313338] z-10">
        <div className="flex items-center gap-2 truncate">
          <Hash className="w-6 h-6 text-[#80848E] flex-shrink-0" />
          <h2 className="font-bold text-white text-sm">{channel.name}</h2>
          {channel.topic && (
            <>
              <div className="w-[1px] h-4 bg-[#3F4147] mx-2" />
              <p className="text-xs text-[#949BA4] truncate">{channel.topic}</p>
            </>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3 text-[#B5BAC1]">
          {/* Pinned Messages */}
          <button
            onClick={loadPinnedMessages}
            className="p-1.5 rounded hover:bg-[#35373C] hover:text-white transition-colors"
            title="Pinned Messages"
          >
            <Pin className="w-5 h-5" />
          </button>

          {/* Member list toggle */}
          <button
            onClick={onToggleMembers}
            className={`p-1.5 rounded transition-colors ${
              isMembersOpen
                ? 'text-white bg-[#35373C]'
                : 'hover:bg-[#35373C] hover:text-white'
            }`}
            title="Member List"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Search */}
          <button
            onClick={() => openModal('globalSearch')}
            className="p-1.5 rounded hover:bg-[#35373C] hover:text-white transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <MessageList
        messages={messages}
        channelName={channel.name}
        topic={channel.topic}
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
        channelName={channel.name}
        replyingTo={replyingTo}
        channelId={channel.id}
        onSendMessage={handleSendMessage}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Pinned Messages Drawer / Modal */}
      {showPinsModal && (
        <div className="absolute top-14 right-4 w-96 bg-[#2B2D31] border border-[#232428] rounded-xl shadow-2xl p-4 z-40 select-none max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[#35363C] mb-3">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Pin className="w-4 h-4 text-discord-yellow" /> Pinned Messages
            </span>
            <button
              onClick={() => setShowPinsModal(false)}
              className="text-[#949BA4] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#949BA4]">
                No pinned messages yet.
              </div>
            ) : (
              pinnedMessages.map((pin) => (
                <div
                  key={pin.id}
                  className="bg-[#1E1F22] p-2.5 rounded border border-[#35363C] text-xs text-[#DBDEE1]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={
                        pin.author.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${pin.author.username}`
                      }
                      alt={pin.author.displayName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-semibold text-white">
                      {pin.author.displayName || pin.author.username}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{pin.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
};
