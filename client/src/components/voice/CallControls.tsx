import React from 'react';
import { useWebRTC } from '../../context/WebRTCContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
} from 'lucide-react';

export const CallControls: React.FC = () => {
  const {
    isMuted,
    isCameraOn,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    leaveVoiceChannel,
  } = useWebRTC();

  return (
    <div className="flex items-center justify-center gap-3 py-3 select-none">
      {/* Mic Mute / Unmute */}
      <button
        onClick={toggleMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isMuted
            ? 'bg-[#ED4245] text-white hover:bg-red-700'
            : 'bg-[#313338] text-white hover:bg-[#3F4147]'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Video Camera Toggle */}
      <button
        onClick={toggleCamera}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isCameraOn
            ? 'bg-discord-green text-white hover:bg-emerald-600'
            : 'bg-[#313338] text-white hover:bg-[#3F4147]'
        }`}
        title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={toggleScreenShare}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isScreenSharing
            ? 'bg-discord-blurple text-white hover:bg-[#4752C4]'
            : 'bg-[#313338] text-white hover:bg-[#3F4147]'
        }`}
        title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
      >
        {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
      </button>

      {/* Disconnect / Hangup */}
      <button
        onClick={leaveVoiceChannel}
        className="w-12 h-12 rounded-full bg-[#ED4245] hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
        title="Disconnect"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
};
