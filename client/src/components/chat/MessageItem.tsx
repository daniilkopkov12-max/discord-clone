import React, { useState } from 'react';
import { Message, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { EmojiPicker } from './EmojiPicker';
import {
  Smile,
  Reply,
  Edit2,
  Trash2,
  Pin,
  Check,
  X,
  FileText,
  Download,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUser: User | null;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReaction: (messageId: string, emoji: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onPin,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isAuthor = currentUser?.id === message.authorId;

  // Format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    return `${d.toLocaleDateString()} ${time}`;
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await onEdit(message.id, editContent);
    setIsEditing(false);
  };

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce(
    (acc: Record<string, { count: number; userIds: string[] }>, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, userIds: [] };
      }
      acc[r.emoji].count += 1;
      acc[r.emoji].userIds.push(r.userId);
      return acc;
    },
    {}
  );

  return (
    <div className="relative group hover:bg-[#2E3035] px-4 py-1.5 transition-colors -mx-4 flex gap-4 select-text">
      {/* Avatar */}
      <img
        src={
          message.author.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${message.author.username}`
        }
        alt={message.author.displayName || message.author.username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
      />

      <div className="flex-1 overflow-hidden">
        {/* Reply reference header */}
        {message.replyTo && (
          <div className="flex items-center gap-1.5 text-xs text-[#B5BAC1] mb-1 pl-2 border-l-2 border-[#4E5058] select-none">
            <span className="font-semibold text-discord-blurple">
              @{message.replyTo.author.displayName || message.replyTo.author.username}
            </span>
            <span className="truncate max-w-md text-[#949BA4]">{message.replyTo.content}</span>
          </div>
        )}

        {/* Author Header */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
            {message.author.displayName || message.author.username}
          </span>
          <span className="text-[11px] text-[#949BA4]">
            {formatDate(message.createdAt)}
          </span>
          {message.isPinned && (
            <span className="flex items-center gap-0.5 text-[10px] bg-[#35373C] text-discord-yellow px-1 rounded font-medium select-none">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
        </div>

        {/* Message Content or Edit box */}
        {isEditing ? (
          <div className="mt-1 space-y-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2 text-sm text-white focus:outline-none focus:border-discord-blurple"
              autoFocus
            />
            <div className="text-[10px] text-[#949BA4]">
              escape to{' '}
              <button onClick={() => setIsEditing(false)} className="text-discord-blurple hover:underline">
                cancel
              </button>{' '}
              • enter to{' '}
              <button onClick={handleSaveEdit} className="text-discord-blurple hover:underline">
                save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
            {message.isEdited && (
              <span className="text-[10px] text-[#949BA4] ml-1 select-none">(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => {
              const isImage = att.contentType.startsWith('image/');

              if (isImage) {
                return (
                  <div key={att.id} className="relative group/att rounded overflow-hidden max-w-sm">
                    <img
                      src={att.url}
                      alt={att.filename}
                      onClick={() => setLightboxImage(att.url)}
                      className="max-h-64 rounded object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                  </div>
                );
              }

              return (
                <a
                  key={att.id}
                  href={att.url}
                  download={att.filename}
                  className="flex items-center gap-3 p-3 bg-[#2B2D31] hover:bg-[#35373C] border border-[#35363C] rounded-lg transition-colors text-xs text-white group/file"
                >
                  <FileText className="w-8 h-8 text-discord-blurple flex-shrink-0" />
                  <div className="overflow-hidden">
                    <div className="font-semibold truncate max-w-[180px]">{att.filename}</div>
                    <div className="text-[10px] text-[#949BA4]">
                      {(att.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[#949BA4] group-hover/file:text-white" />
                </a>
              );
            })}
          </div>
        )}

        {/* Reactions row */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 select-none">
            {Object.entries(reactionGroups).map(([emoji, data]) => {
              const hasReacted = currentUser && data.userIds.includes(currentUser.id);

              return (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                    hasReacted
                      ? 'bg-discord-blurple/20 border-discord-blurple text-discord-blurple font-bold'
                      : 'bg-[#2B2D31] border-[#3F4147] text-[#DBDEE1] hover:bg-[#35373C]'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar on hover */}
      <div className="absolute right-4 -top-3 hidden group-hover:flex items-center bg-[#313338] border border-[#232428] rounded shadow-lg select-none z-10 overflow-hidden">
        {/* Reaction button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1.5 text-[#B5BAC1] hover:text-white hover:bg-[#35373C] transition-colors"
          title="Add Reaction"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Reply button */}
        <button
          onClick={() => onReply(message)}
          className="p-1.5 text-[#B5BAC1] hover:text-white hover:bg-[#35373C] transition-colors"
          title="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>

        {/* Pin button */}
        <button
          onClick={() => onPin(message.id)}
          className={`p-1.5 transition-colors ${
            message.isPinned
              ? 'text-discord-yellow bg-[#35373C]'
              : 'text-[#B5BAC1] hover:text-white hover:bg-[#35373C]'
          }`}
          title={message.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-4 h-4" />
        </button>

        {/* Edit button (author only) */}
        {isAuthor && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-[#B5BAC1] hover:text-white hover:bg-[#35373C] transition-colors"
            title="Edit Message"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        {/* Delete button (author or mod) */}
        {(isAuthor || currentUser) && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this message?')) {
                onDelete(message.id);
              }
            }}
            className="p-1.5 text-[#B5BAC1] hover:text-[#ED4245] hover:bg-[#35373C] transition-colors"
            title="Delete Message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={(emoji) => onReaction(message.id, emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Enlarged"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
