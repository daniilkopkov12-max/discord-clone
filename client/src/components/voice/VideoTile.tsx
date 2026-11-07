import React, { useEffect, useRef } from 'react';
import { VoiceParticipant } from '../../types';
import { Mic, MicOff, Video, Monitor } from 'lucide-react';

interface VideoTileProps {
  participant: VoiceParticipant;
  stream?: MediaStream | null;
  isLocal?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  stream,
  isLocal = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && participant.isCameraOn;

  return (
    <div
      className={`relative bg-[#1E1F22] rounded-xl overflow-hidden flex items-center justify-center border-2 transition-all duration-200 aspect-video select-none group ${
        participant.isSpeaking
          ? 'border-discord-green shadow-lg shadow-discord-green/20'
          : 'border-[#2B2D31]'
      }`}
    >
      {/* Video stream */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar when camera is off */
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <img
              src={
                participant.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.username}`
              }
              alt={participant.displayName}
              className={`w-20 h-20 rounded-full object-cover transition-transform ${
                participant.isSpeaking ? 'scale-105' : ''
              }`}
            />
            {participant.isSpeaking && (
              <span className="absolute inset-0 rounded-full border-4 border-discord-green animate-ping pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* Screen share badge if sharing */}
      {participant.isScreenSharing && (
        <div className="absolute top-3 left-3 bg-[#111214]/80 backdrop-blur px-2 py-1 rounded flex items-center gap-1.5 text-xs font-semibold text-discord-blurple">
          <Monitor className="w-3.5 h-3.5" />
          <span>Screen</span>
        </div>
      )}

      {/* Bottom Name Tag & Status Indicators */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-[#111214]/80 backdrop-blur px-2.5 py-1 rounded flex items-center gap-2">
          <span className="text-xs font-semibold text-white truncate max-w-[140px]">
            {participant.displayName} {isLocal && '(You)'}
          </span>
          {participant.isMuted && (
            <MicOff className="w-3.5 h-3.5 text-[#ED4245] flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};
