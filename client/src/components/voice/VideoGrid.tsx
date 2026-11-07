import React from 'react';
import { VoiceParticipant } from '../../types';
import { VideoTile } from './VideoTile';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext';

interface VideoGridProps {
  participants: VoiceParticipant[];
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  remoteStreams,
  localStream,
}) => {
  const { user } = useAuth();
  const { isMuted, isDeafened, isCameraOn, isScreenSharing, isSpeaking } = useWebRTC();

  const localParticipant: VoiceParticipant = {
    socketId: 'local',
    userId: user?.id || 'me',
    username: user?.username || 'me',
    displayName: user?.displayName || user?.username || 'You',
    avatarUrl: user?.avatarUrl || '',
    channelId: 'current',
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    isSpeaking,
  };

  const allTiles = [
    { participant: localParticipant, stream: localStream, isLocal: true },
    ...participants.map((p) => ({
      participant: p,
      stream: remoteStreams.get(p.socketId) || null,
      isLocal: false,
    })),
  ];

  const count = allTiles.length;
  let gridCols = 'grid-cols-1';
  if (count === 2) gridCols = 'grid-cols-2';
  else if (count >= 3 && count <= 4) gridCols = 'grid-cols-2';
  else if (count >= 5) gridCols = 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4 w-full h-full max-w-6xl mx-auto items-center p-4`}>
      {allTiles.map(({ participant, stream, isLocal }) => (
        <VideoTile
          key={participant.socketId}
          participant={participant}
          stream={stream}
          isLocal={isLocal}
        />
      ))}
    </div>
  );
};
