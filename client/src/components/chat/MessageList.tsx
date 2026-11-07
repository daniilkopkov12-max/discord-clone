import React, { useEffect, useRef } from 'react';
import { Message, User } from '../../types';
import { MessageItem } from './MessageItem';
import { Hash } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  channelName: string;
  topic?: string | null;
  currentUser: User | null;
  typingUsernames: string[];
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onReaction: (messageId: string, emoji: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  channelName,
  topic,
  currentUser,
  typingUsernames,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onPin,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 select-text">
      {/* Channel Welcome Banner */}
      <div className="mb-6 pt-4 pb-2 border-b border-[#35363C]/60 select-none">
        <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center mb-3">
          <Hash className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Welcome to #{channelName}!</h2>
        <p className="text-sm text-[#949BA4]">
          {topic || `This is the start of the #${channelName} channel.`}
        </p>
      </div>

      {/* Messages */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUser={currentUser}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
          onPin={onPin}
        />
      ))}

      {/* Typing indicator */}
      {typingUsernames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[#949BA4] py-1 animate-pulse select-none">
          <span className="font-semibold text-white">
            {typingUsernames.join(', ')}
          </span>{' '}
          {typingUsernames.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
