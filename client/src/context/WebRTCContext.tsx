import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { VoiceParticipant } from '../types';
import { playSound } from '../utils/sounds';

interface IncomingCall {
  conversationId: string;
  caller: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  callType: 'voice' | 'video';
}

interface WebRTCContextType {
  currentVoiceChannelId: string | null;
  activeConversationCallId: string | null;
  participants: VoiceParticipant[];
  remoteStreams: Map<string, MediaStream>; // socketId -> MediaStream
  localStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  incomingCall: IncomingCall | null;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  startDirectCall: (conversationId: string, targetUserId: string, callType?: 'voice' | 'video') => void;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  endCall: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

// Free public Google STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();

  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const [activeConversationCallId, setActiveConversationCallId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // References
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveVoiceChannel();
    };
  }, []);

  // Voice socket listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Existing participants in voice channel
    socket.on('webrtc:all_users', async (existingUsers: VoiceParticipant[]) => {
      setParticipants(existingUsers);

      // Create WebRTC Offer for each existing user
      for (const participant of existingUsers) {
        await createPeerConnectionAndOffer(participant.socketId);
      }
    });

    // New participant joined
    socket.on('webrtc:user_joined', (participant: VoiceParticipant) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      playSound.join();
    });

    // WebRTC signaling exchange (Offer / Answer / Candidate)
    socket.on('webrtc:signal', async ({ from, signal, type }: { from: string; signal: any; type?: string }) => {
      let pc = peerConnections.current.get(from);

      if (type === 'offer') {
        if (!pc) {
          pc = createPeerConnection(from);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:signal', {
          to: from,
          signal: answer,
          type: 'answer',
        });
      } else if (type === 'answer') {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } else if (type === 'candidate' && signal) {
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    });

    // Participant media state changed
    socket.on('webrtc:media_state_changed', ({ socketId, state }: any) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, ...state } : p))
      );
    });

    // Speaking state changed
    socket.on('webrtc:user_speaking', ({ socketId, isSpeaking: speaking }: any) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isSpeaking: speaking } : p))
      );
    });

    // User left voice
    socket.on('webrtc:user_left', ({ socketId }: any) => {
      closePeerConnection(socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      playSound.leave();
    });

    // Incoming Direct Call
    socket.on('call:incoming', (callData: IncomingCall) => {
      setIncomingCall(callData);
      stopRingtoneRef.current = playSound.startRingtone();
    });

    // Direct Call Accepted
    socket.on('call:accepted', async ({ conversationId }: { conversationId: string }) => {
      setActiveConversationCallId(conversationId);
      await initLocalAudio();
      socket.emit('webrtc:join_voice', {
        channelId: `dm:${conversationId}`,
        userDetails: {
          displayName: user?.displayName,
          avatarUrl: user?.avatarUrl,
        },
      });
    });

    // Direct Call Rejected
    socket.on('call:rejected', () => {
      if (stopRingtoneRef.current) stopRingtoneRef.current();
      alert('Call declined');
      setActiveConversationCallId(null);
    });

    // Direct Call Ended
    socket.on('call:ended', () => {
      leaveVoiceChannel();
    });

    return () => {
      socket.off('webrtc:all_users');
      socket.off('webrtc:user_joined');
      socket.off('webrtc:signal');
      socket.off('webrtc:media_state_changed');
      socket.off('webrtc:user_speaking');
      socket.off('webrtc:user_left');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socket, isConnected, user]);

  // Create WebRTC Peer Connection
  const createPeerConnection = (remoteSocketId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(remoteSocketId, remoteStream);
          return updated;
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:signal', {
          to: remoteSocketId,
          signal: event.candidate,
          type: 'candidate',
        });
      }
    };

    peerConnections.current.set(remoteSocketId, pc);
    return pc;
  };

  const createPeerConnectionAndOffer = async (remoteSocketId: string) => {
    const pc = createPeerConnection(remoteSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socket) {
      socket.emit('webrtc:signal', {
        to: remoteSocketId,
        signal: offer,
        type: 'offer',
      });
    }
  };

  const closePeerConnection = (remoteSocketId: string) => {
    const pc = peerConnections.current.get(remoteSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(remoteSocketId);
    }
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(remoteSocketId);
      return updated;
    });
  };

  // Initialize local microphone audio
  const initLocalAudio = async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Setup audio analyzer for speaking detection
      setupSpeakingDetector(stream);

      return stream;
    } catch (err) {
      console.warn('Microphone permission denied or not available. Running in receive-only mode.', err);
      // Create silent empty audio track so WebRTC connection can still form
      const dummyCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = dummyCtx.createOscillator();
      const dst = osc.connect(dummyCtx.createMediaStreamDestination()) as any;
      osc.start();
      const stream = dst.stream;
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    }
  };

  // Speaking detector with Web Audio API
  const setupSpeakingDetector = (stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -70;
      analyser.maxDecibels = -10;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let wasSpeaking = false;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const nowSpeaking = average > 18 && !isMuted;

        if (nowSpeaking !== wasSpeaking) {
          wasSpeaking = nowSpeaking;
          setIsSpeaking(nowSpeaking);
          if (socket && currentVoiceChannelId) {
            socket.emit('webrtc:speaking_state', {
              channelId: currentVoiceChannelId,
              isSpeaking: nowSpeaking,
            });
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error('Speaking detector error:', e);
    }
  };

  // Join Voice Channel
  const joinVoiceChannel = async (channelId: string) => {
    if (!socket || !user) return;

    // Leave any current channel
    if (currentVoiceChannelId) {
      leaveVoiceChannel();
    }

    await initLocalAudio();
    setCurrentVoiceChannelId(channelId);
    playSound.join();

    socket.emit('webrtc:join_voice', {
      channelId,
      userDetails: {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isMuted,
        isDeafened,
        isCameraOn,
        isScreenSharing,
      },
    });
  };

  // Leave Voice Channel / Hangup
  const leaveVoiceChannel = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    if (socket) {
      socket.emit('webrtc:leave_voice');
    }

    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());

    // Stop tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Stop speaking detection
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (currentVoiceChannelId || activeConversationCallId) {
      playSound.leave();
    }

    setCurrentVoiceChannelId(null);
    setActiveConversationCallId(null);
    setParticipants([]);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    setIncomingCall(null);
  };

  // Toggle Mute Microphone
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (nextMuted) playSound.mute();
    else playSound.unmute();

    if (socket && currentVoiceChannelId) {
      socket.emit('webrtc:media_state', {
        channelId: currentVoiceChannelId,
        state: { isMuted: nextMuted },
      });
    }
  };

  // Toggle Deafen
  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    if (nextDeafened) {
      setIsMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      playSound.mute();
    } else {
      playSound.unmute();
    }

    if (socket && currentVoiceChannelId) {
      socket.emit('webrtc:media_state', {
        channelId: currentVoiceChannelId,
        state: { isDeafened: nextDeafened, isMuted: nextDeafened ? true : isMuted },
      });
    }
  };

  // Toggle Video Camera
  const toggleCamera = async () => {
    try {
      if (isCameraOn) {
        // Stop video track
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.stop();
            localStreamRef.current.removeTrack(videoTrack);
          }
        }
        setIsCameraOn(false);
      } else {
        // Start video track
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        } else {
          localStreamRef.current = videoStream;
          setLocalStream(videoStream);
        }

        // Replace or add track to all peer connections
        peerConnections.current.forEach((pc) => {
          pc.addTrack(videoTrack, localStreamRef.current!);
        });

        setIsCameraOn(true);
      }

      if (socket && currentVoiceChannelId) {
        socket.emit('webrtc:media_state', {
          channelId: currentVoiceChannelId,
          state: { isCameraOn: !isCameraOn },
        });
      }
    } catch (err) {
      alert('Could not access camera. Please allow camera permissions.');
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks()[0];
          if (screenTrack) {
            screenTrack.stop();
            localStreamRef.current.removeTrack(screenTrack);
          }
        }
        setIsScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (socket && currentVoiceChannelId) {
            socket.emit('webrtc:media_state', {
              channelId: currentVoiceChannelId,
              state: { isScreenSharing: false },
            });
          }
        };

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(screenTrack);
        } else {
          localStreamRef.current = screenStream;
          setLocalStream(screenStream);
        }

        peerConnections.current.forEach((pc) => {
          pc.addTrack(screenTrack, localStreamRef.current!);
        });

        setIsScreenSharing(true);
      }

      if (socket && currentVoiceChannelId) {
        socket.emit('webrtc:media_state', {
          channelId: currentVoiceChannelId,
          state: { isScreenSharing: !isScreenSharing },
        });
      }
    } catch (err) {
      console.warn('Screen sharing cancelled or not supported');
    }
  };

  // Start direct call
  const startDirectCall = (conversationId: string, targetUserId: string, callType: 'voice' | 'video' = 'voice') => {
    if (!socket || !user) return;
    setActiveConversationCallId(conversationId);
    stopRingtoneRef.current = playSound.startRingtone();

    socket.emit('call:initiate', {
      conversationId,
      targetUserId,
      callerInfo: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      callType,
    });
  };

  // Accept incoming call
  const acceptIncomingCall = async () => {
    if (!incomingCall || !socket) return;
    if (stopRingtoneRef.current) stopRingtoneRef.current();

    setActiveConversationCallId(incomingCall.conversationId);
    socket.emit('call:accept', { conversationId: incomingCall.conversationId });

    await initLocalAudio();
    if (incomingCall.callType === 'video') {
      await toggleCamera();
    }

    socket.emit('webrtc:join_voice', {
      channelId: `dm:${incomingCall.conversationId}`,
      userDetails: {
        displayName: user?.displayName,
        avatarUrl: user?.avatarUrl,
      },
    });

    setIncomingCall(null);
  };

  // Decline incoming call
  const declineIncomingCall = () => {
    if (!incomingCall || !socket) return;
    if (stopRingtoneRef.current) stopRingtoneRef.current();

    socket.emit('call:reject', { conversationId: incomingCall.conversationId });
    setIncomingCall(null);
  };

  // End active call
  const endCall = () => {
    if (activeConversationCallId && socket) {
      socket.emit('call:end', { conversationId: activeConversationCallId });
    }
    leaveVoiceChannel();
  };

  return (
    <WebRTCContext.Provider
      value={{
        currentVoiceChannelId,
        activeConversationCallId,
        participants,
        remoteStreams,
        localStream,
        isMuted,
        isDeafened,
        isCameraOn,
        isScreenSharing,
        isSpeaking,
        incomingCall,
        joinVoiceChannel,
        leaveVoiceChannel,
        toggleMute,
        toggleDeafen,
        toggleCamera,
        toggleScreenShare,
        startDirectCall,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};

export function useWebRTC() {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error('useWebRTC must be used within a WebRTCProvider');
  return context;
}
