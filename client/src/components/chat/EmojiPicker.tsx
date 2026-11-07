import React from 'react';

const EMOJI_CATEGORIES = [
  {
    name: 'Frequent & Smileys',
    emojis: ['👍', '❤️', '🔥', '🚀', '🎉', '😂', '😍', '👀', '✨', '🙌', '😎', '🥳', '🤔', '😭', '💯', '👏'],
  },
  {
    name: 'Fun & Gaming',
    emojis: ['🎮', '👾', '🕹️', '🏆', '💎', '⚔️', '🛡️', '⚡', '☕', '🍕', '🍻', '🍿', '🎧', '💻', '💡', '🌟'],
  },
  {
    name: 'Reactions & Gestures',
    emojis: ['👋', '🤝', '✌️', '💪', '🙏', '🙋', '🤷', '🤦', '🤫', '💀', '💩', '🤡', '👻', '🤖', '👑', '🌈'],
  },
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  return (
    <div className="absolute bottom-14 right-2 bg-[#2B2D31] border border-[#232428] rounded-lg shadow-2xl p-3 w-72 z-50 select-none">
      <div className="flex items-center justify-between pb-2 border-b border-[#35363C] mb-2">
        <span className="text-xs font-bold text-[#F2F3F5]">Emojis</span>
        <button
          onClick={onClose}
          className="text-xs text-[#949BA4] hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-3">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <div className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider mb-1">
              {cat.name}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelectEmoji(emoji);
                    onClose();
                  }}
                  className="w-7 h-7 text-lg flex items-center justify-center rounded hover:bg-[#35373C] hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
