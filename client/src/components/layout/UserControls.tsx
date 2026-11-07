import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext';
import { useModal } from '../../context/ModalContext';
import { Mic, MicOff, Headphones, Settings, Shield } from 'lucide-react';

export const UserControls: React.FC = () => {
  const { user } = useAuth();
  const { isMuted, isDeafened, toggleMute, toggleDeafen } = useWebRTC();
  const { openModal } = useModal();

  if (!user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-[#23A55A]';
      case 'idle':
        return 'bg-[#F0B232]';
      case 'dnd':
        return 'bg-[#F23F43]';
      default:
        return 'bg-[#80848E]';
    }
  };

  return (
    <div className="h-[52px] bg-[#232428] px-2 flex items-center justify-between border-t border-[#1F2023] select-none flex-shrink-0 z-20">
      {/* Profile & Avatar */}
      <button
        onClick={() => openModal('userSettings')}
        className="flex items-center gap-2 p-1 -ml-1 rounded hover:bg-[#35373C] transition-colors max-w-[130px] group text-left"
        title="Account Settings"
      >
        <div className="relative flex-shrink-0">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
            alt={user.displayName || user.username}
            className="w-8 h-8 rounded-full object-cover"
          />
          {/* Status badge */}
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#232428] ${getStatusColor(
              user.status
            )}`}
          />
        </div>

        <div className="overflow-hidden leading-tight">
          <div className="text-xs font-semibold text-[#F2F3F5] truncate group-hover:text-white">
            {user.displayName || user.username}
          </div>
          <div className="text-[10px] text-[#949BA4] truncate">
            {user.customStatus || `#${user.username}`}
          </div>
        </div>
      </button>

      {/* Control Buttons (Mute, Deafen, Settings) */}
      <div className="flex items-center space-x-0.5 text-[#B5BAC1]">
        {/* Mic */}
        <button
          onClick={toggleMute}
          className={`p-1.5 rounded hover:bg-[#35373C] transition-colors relative ${
            isMuted ? 'text-[#ED4245]' : 'hover:text-[#DBDEE1]'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Headphones / Deafen */}
        <button
          onClick={toggleDeafen}
          className={`p-1.5 rounded hover:bg-[#35373C] transition-colors relative ${
            isDeafened ? 'text-[#ED4245]' : 'hover:text-[#DBDEE1]'
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          <Headphones className="w-5 h-5" />
          {isDeafened && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-5 h-[2px] bg-[#ED4245] rotate-45 transform" />
            </span>
          )}
        </button>

        {/* User Settings */}
        <button
          onClick={() => openModal('userSettings')}
          className="p-1.5 rounded hover:bg-[#35373C] hover:text-[#DBDEE1] transition-colors"
          title="User Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
