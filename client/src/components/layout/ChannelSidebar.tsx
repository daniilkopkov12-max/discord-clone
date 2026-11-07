import React, { useState } from 'react';
import { Server, Channel, Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext';
import { useModal } from '../../context/ModalContext';
import { UserControls } from './UserControls';
import {
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  PhoneOff,
  UserPlus,
  Trash2,
  Radio,
  Mic,
  MicOff,
  Video,
  Monitor,
} from 'lucide-react';

interface ChannelSidebarProps {
  server: Server;
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onRefreshServer?: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  server,
  activeChannelId,
  onSelectChannel,
  onRefreshServer,
}) => {
  const { user } = useAuth();
  const { currentVoiceChannelId, participants, joinVoiceChannel, leaveVoiceChannel, isSpeaking } = useWebRTC();
  const { openModal } = useModal();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const isOwner = server.ownerId === user?.id;

  // Group channels by category
  const uncategorizedChannels = server.channels.filter((c) => !c.categoryId);
  const categoriesWithChannels = server.categories.map((cat) => ({
    ...cat,
    channels: server.channels.filter((c) => c.categoryId === cat.id),
  }));

  const activeVoiceChannel = server.channels.find((c) => c.id === currentVoiceChannelId);

  return (
    <div className="w-60 h-screen bg-[#2B2D31] flex flex-col justify-between select-none flex-shrink-0 z-20 border-r border-[#1F2023]/40">
      {/* Top Server Header / Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full h-12 px-4 flex items-center justify-between border-b border-[#1F2023] hover:bg-[#35373C] transition-colors font-bold text-white text-sm"
        >
          <span className="truncate">{server.name}</span>
          <ChevronDown
            className={`w-4 h-4 text-[#949BA4] transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-14 left-2 right-2 bg-[#111214] rounded-md p-1.5 shadow-2xl z-50 border border-[#232428] text-xs font-medium space-y-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}?invite=${server.inviteCode}`
                );
                alert(`Invite link copied: ${window.location.origin}?invite=${server.inviteCode}`);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-discord-blurple hover:bg-discord-blurple hover:text-white rounded transition-colors"
            >
              <span>Invite People</span>
              <UserPlus className="w-4 h-4" />
            </button>

            {isOwner && (
              <button
                onClick={() => {
                  openModal('serverSettings', { server });
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-[#DBDEE1] hover:bg-discord-blurple hover:text-white rounded transition-colors"
              >
                <span>Server Settings</span>
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                openModal('createChannel', { server });
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-[#DBDEE1] hover:bg-discord-blurple hover:text-white rounded transition-colors"
            >
              <span>Create Channel</span>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="space-y-0.5">
            {uncategorizedChannels.map((channel) => renderChannelItem(channel))}
          </div>
        )}

        {/* Categories */}
        {categoriesWithChannels.map((cat) => {
          const isCollapsed = collapsedCategories[cat.id];

          return (
            <div key={cat.id} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-[#949BA4] tracking-wider uppercase group hover:text-[#DBDEE1] cursor-pointer">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-1 flex-1 py-1"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span className="truncate">{cat.name}</span>
                </button>

                <button
                  onClick={() =>
                    openModal('createChannel', { server, category: { id: cat.id, name: cat.name } })
                  }
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Channels in Category */}
              {!isCollapsed && (
                <div className="space-y-0.5 pl-1">
                  {cat.channels.map((channel) => renderChannelItem(channel))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Voice Connection Bar (if connected to voice) */}
      {currentVoiceChannelId && activeVoiceChannel && (
        <div className="bg-[#202225] p-2.5 flex items-center justify-between border-t border-[#1F2023] text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-discord-green animate-pulse" />
            <div className="overflow-hidden">
              <div className="text-discord-green font-bold text-[11px] truncate">
                Voice Connected
              </div>
              <div className="text-[#949BA4] text-[10px] truncate">
                {activeVoiceChannel.name}
              </div>
            </div>
          </div>

          <button
            onClick={leaveVoiceChannel}
            className="p-1.5 rounded hover:bg-[#35373C] text-[#ED4245] transition-colors"
            title="Disconnect"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom User Controls */}
      <UserControls />
    </div>
  );

  function renderChannelItem(channel: Channel) {
    const isText = channel.type === 'TEXT';
    const isActive = activeChannelId === channel.id;
    const isVoiceConnected = currentVoiceChannelId === channel.id;

    return (
      <div key={channel.id} className="space-y-1">
        <div
          onClick={() => {
            if (isText) {
              onSelectChannel(channel.id);
            } else {
              // Voice channel: connect or open
              onSelectChannel(channel.id);
              if (currentVoiceChannelId !== channel.id) {
                joinVoiceChannel(channel.id);
              }
            }
          }}
          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isActive
              ? 'bg-[#404249] text-white font-medium'
              : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isText ? (
              <Hash className="w-4 h-4 text-[#80848E] flex-shrink-0" />
            ) : (
              <Volume2
                className={`w-4 h-4 flex-shrink-0 ${
                  isVoiceConnected ? 'text-discord-green' : 'text-[#80848E]'
                }`}
              />
            )}
            <span className="text-xs truncate">{channel.name}</span>
          </div>

          {/* Settings cog for channel */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openModal('channelSettings', { channel, server });
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity text-[#949BA4]"
            title="Channel Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live participants in Voice Channel */}
        {!isText && isVoiceConnected && participants.length > 0 && (
          <div className="pl-6 space-y-1 py-1">
            {participants.map((p) => (
              <div
                key={p.socketId}
                className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-[#35373C] text-[11px] text-[#DBDEE1]"
              >
                <div className="relative">
                  <img
                    src={
                      p.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`
                    }
                    alt={p.displayName}
                    className={`w-5 h-5 rounded-full object-cover transition-all ${
                      p.isSpeaking ? 'ring-2 ring-discord-green shadow-sm shadow-discord-green' : ''
                    }`}
                  />
                </div>
                <span className="truncate flex-1">{p.displayName}</span>

                <div className="flex items-center gap-1 text-[#80848E]">
                  {p.isMuted && <MicOff className="w-3 h-3 text-[#ED4245]" />}
                  {p.isCameraOn && <Video className="w-3 h-3 text-discord-green" />}
                  {p.isScreenSharing && <Monitor className="w-3 h-3 text-discord-blurple" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
};
