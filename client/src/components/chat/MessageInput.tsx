import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentPreview } from './AttachmentPreview';
import { api } from '../../utils/api';
import { PlusCircle, Smile, Send, X } from 'lucide-react';

interface MessageInputProps {
  channelName: string;
  replyingTo: Message | null;
  channelId?: string;
  conversationId?: string;
  onSendMessage: (content: string, attachments?: any[], replyToId?: string) => Promise<void>;
  onCancelReply: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  replyingTo,
  channelId,
  conversationId,
  onSendMessage,
  onCancelReply,
}) => {
  const { startTyping, stopTyping } = useSocket();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<{ file: File; previewUrl?: string }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);

    // Typing indicator throttle
    startTyping(channelId, conversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping(channelId, conversationId);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    stopTyping(channelId, conversationId);
    setIsUploading(true);

    try {
      let uploadedAttachments: any[] = [];

      // Upload any attachments
      if (attachments.length > 0) {
        for (const item of attachments) {
          const res = await api.upload(item.file);
          uploadedAttachments.push(res);
        }
      }

      await onSendMessage(content, uploadedAttachments, replyingTo?.id);

      setContent('');
      setAttachments([]);
      onCancelReply();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-0 bg-[#313338] relative select-none">
      {/* Replying banner */}
      {replyingTo && (
        <div className="bg-[#2B2D31] px-3 py-1.5 rounded-t flex items-center justify-between text-xs text-[#B5BAC1] border-b border-[#35363C]">
          <div className="flex items-center gap-1.5 truncate">
            <span>Replying to</span>
            <span className="font-semibold text-discord-blurple">
              @{replyingTo.author.displayName || replyingTo.author.username}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-[#949BA4] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />

      <form
        onSubmit={handleSubmit}
        className={`bg-[#383A40] flex items-center px-4 py-2.5 transition-colors relative ${
          replyingTo || attachments.length > 0 ? 'rounded-b-lg' : 'rounded-lg'
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        {/* Upload Button (+) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[#B5BAC1] hover:text-white mr-3 transition-colors flex-shrink-0"
          title="Upload a file or image"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Input field */}
        <input
          type="text"
          value={content}
          onChange={handleTextChange}
          placeholder={`Message #${channelName}`}
          className="w-full bg-transparent text-[#DBDEE1] placeholder-[#80848E] focus:outline-none text-sm leading-relaxed"
          autoFocus
        />

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-[#B5BAC1] hover:text-discord-yellow ml-2 transition-colors flex-shrink-0"
          title="Add Emoji"
        >
          <Smile className="w-6 h-6" />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isUploading || (!content.trim() && attachments.length === 0)}
          className="ml-2 text-discord-blurple hover:text-[#4752C4] disabled:opacity-30 transition-colors flex-shrink-0"
          title="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelectEmoji={(emoji) => setContent((prev) => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
};
