import React from 'react';
import { useWebRTC } from '../../context/WebRTCContext';
import { Phone, PhoneOff, Video } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useWebRTC();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
      <div className="bg-[#313338] border border-[#232428] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center relative overflow-hidden animate-bounce-short">
        {/* Animated Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-discord-blurple via-discord-green to-discord-yellow" />

        {/* Caller Avatar with ringing pulse */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          <img
            src={
              incomingCall.caller.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.caller.username}`
            }
            alt={incomingCall.caller.displayName || incomingCall.caller.username}
            className="w-full h-full rounded-full object-cover ring-4 ring-discord-green"
          />
          <span className="absolute inset-0 rounded-full border-4 border-discord-green animate-ping pointer-events-none" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {incomingCall.caller.displayName || incomingCall.caller.username}
        </h3>
        <p className="text-xs text-[#949BA4] mb-6 flex items-center justify-center gap-1.5">
          {isVideo ? (
            <>
              <Video className="w-3.5 h-3.5 text-discord-green" /> Incoming Video Call...
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5 text-discord-green" /> Incoming Voice Call...
            </>
          )}
        </p>

        {/* Buttons (Decline / Accept) */}
        <div className="flex items-center justify-center gap-6">
          {/* Decline */}
          <button
            onClick={declineIncomingCall}
            className="w-14 h-14 rounded-full bg-[#ED4245] hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            title="Decline"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Accept */}
          <button
            onClick={acceptIncomingCall}
            className="w-14 h-14 rounded-full bg-discord-green hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            title="Accept"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
