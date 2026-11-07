import React from 'react';
import { Channel } from '../../types';
import { useWebRTC } from '../../context/WebRTCContext';
import { VideoGrid } from './VideoGrid';
import { CallControls } from './CallControls';
import { Volume2, Users, Wifi } from 'lucide-react';

interface VoiceChannelViewProps {
  channel: Channel;
}

export const VoiceChannelView: React.FC<VoiceChannelViewProps> = ({ channel }) => {
  const { participants, remoteStreams, localStream } = useWebRTC();

  return (
    <div className="flex-1 h-screen bg-[#111214] flex flex-col justify-between overflow-hidden select-none">
      {/* Voice Channel Header */}
      <div className="h-12 border-b border-[#1F2023] px-6 flex items-center justify-between bg-[#2B2D31]/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-discord-green" />
          <h2 className="font-bold text-white text-sm">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#949BA4]">
          <div className="flex items-center gap-1.5 text-discord-green">
            <Wifi className="w-3.5 h-3.5" />
            <span className="font-medium">RTC Connected</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{participants.length + 1}</span>
          </div>
        </div>
      </div>

      {/* Main Video & Audio Stage */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
        <VideoGrid
          participants={participants}
          remoteStreams={remoteStreams}
          localStream={localStream}
        />
      </div>

      {/* Bottom Call Controls */}
      <div className="bg-[#1E1F22]/90 backdrop-blur border-t border-[#232428]">
        <CallControls />
      </div>
    </div>
  );
};
