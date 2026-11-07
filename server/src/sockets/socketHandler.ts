import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { prisma } from '../db.js';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

// In-memory tracking
const activeUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const voiceRooms = new Map<string, Map<string, VoiceParticipant>>(); // channelId -> Map<socketId, VoiceParticipant>
const activeCalls = new Map<string, { conversationId: string; callerId: string; receiverId?: string; type: string }>();

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.user = payload;
    next();
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    const userId = user.userId;

    // Track active socket
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId)!.add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Broadcast online status to everyone
    io.emit('user:status_update', {
      userId,
      status: 'online',
    });

    // Provide initial list of online user IDs
    socket.emit('users:online_list', Array.from(activeUsers.keys()));

    // ----------------------------------------------------------------
    // TEXT CHANNELS & DMS
    // ----------------------------------------------------------------

    // Join text channel room
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    // Leave text channel room
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Join DM conversation room
    socket.on('dm:join', (conversationId: string) => {
      socket.join(`dm:${conversationId}`);
    });

    // Leave DM conversation room
    socket.on('dm:leave', (conversationId: string) => {
      socket.leave(`dm:${conversationId}`);
    });

    // Typing start
    socket.on('typing:start', ({ channelId, conversationId }: { channelId?: string; conversationId?: string }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:user', {
          userId,
          username: user.username,
          channelId,
          isTyping: true,
        });
      } else if (conversationId) {
        socket.to(`dm:${conversationId}`).emit('typing:user', {
          userId,
          username: user.username,
          conversationId,
          isTyping: true,
        });
      }
    });

    // Typing stop
    socket.on('typing:stop', ({ channelId, conversationId }: { channelId?: string; conversationId?: string }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:user', {
          userId,
          username: user.username,
          channelId,
          isTyping: false,
        });
      } else if (conversationId) {
        socket.to(`dm:${conversationId}`).emit('typing:user', {
          userId,
          username: user.username,
          conversationId,
          isTyping: false,
        });
      }
    });

    // Broadcast new message
    socket.on('message:send', (message: any) => {
      if (message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:new', message);
      } else if (message.dmConversationId) {
        io.to(`dm:${message.dmConversationId}`).emit('message:new', message);
      }
    });

    // Broadcast message edit
    socket.on('message:edit', (message: any) => {
      if (message.channelId) {
        io.to(`channel:${message.channelId}`).emit('message:update', message);
      } else if (message.dmConversationId) {
        io.to(`dm:${message.dmConversationId}`).emit('message:update', message);
      }
    });

    // Broadcast message delete
    socket.on('message:delete', ({ messageId, channelId, dmConversationId }: any) => {
      if (channelId) {
        io.to(`channel:${channelId}`).emit('message:deleted', { messageId });
      } else if (dmConversationId) {
        io.to(`dm:${dmConversationId}`).emit('message:deleted', { messageId });
      }
    });

    // Broadcast reaction update
    socket.on('message:reaction', (reactionData: any) => {
      const { channelId, dmConversationId } = reactionData;
      if (channelId) {
        io.to(`channel:${channelId}`).emit('message:reaction_update', reactionData);
      } else if (dmConversationId) {
        io.to(`dm:${dmConversationId}`).emit('message:reaction_update', reactionData);
      }
    });

    // ----------------------------------------------------------------
    // VOICE & VIDEO WEBRTC MESH SIGNALING
    // ----------------------------------------------------------------

    socket.on('webrtc:join_voice', async ({ channelId, userDetails }: { channelId: string; userDetails: any }) => {
      // Leave any existing voice room first
      leaveCurrentVoiceRoom(socket);

      if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Map());
      }

      const room = voiceRooms.get(channelId)!;

      const participant: VoiceParticipant = {
        socketId: socket.id,
        userId,
        username: user.username,
        displayName: userDetails?.displayName || user.username,
        avatarUrl: userDetails?.avatarUrl || '',
        channelId,
        isMuted: !!userDetails?.isMuted,
        isDeafened: !!userDetails?.isDeafened,
        isCameraOn: !!userDetails?.isCameraOn,
        isScreenSharing: !!userDetails?.isScreenSharing,
        isSpeaking: false,
      };

      room.set(socket.id, participant);
      socket.join(`voice:${channelId}`);

      // Send the list of existing participants in this room to the joining user
      const existingParticipants = Array.from(room.values()).filter((p) => p.socketId !== socket.id);
      socket.emit('webrtc:all_users', existingParticipants);

      // Notify other participants in the room
      socket.to(`voice:${channelId}`).emit('webrtc:user_joined', participant);

      // Also announce channel-wide participant count
      io.emit('voice:channel_participants', {
        channelId,
        participants: Array.from(room.values()),
      });
    });

    // Forward WebRTC signal (Offer, Answer, ICE candidate) to target socket
    socket.on('webrtc:signal', ({ to, signal, type }: { to: string; signal: any; type?: string }) => {
      io.to(to).emit('webrtc:signal', {
        from: socket.id,
        signal,
        type,
      });
    });

    // Update media state (mic, deafen, camera, screen share)
    socket.on('webrtc:media_state', ({ channelId, state }: { channelId: string; state: Partial<VoiceParticipant> }) => {
      const room = voiceRooms.get(channelId);
      if (room && room.has(socket.id)) {
        const participant = room.get(socket.id)!;
        Object.assign(participant, state);
        io.to(`voice:${channelId}`).emit('webrtc:media_state_changed', {
          socketId: socket.id,
          state,
        });
      }
    });

    // Update speaking indicator
    socket.on('webrtc:speaking_state', ({ channelId, isSpeaking }: { channelId: string; isSpeaking: boolean }) => {
      const room = voiceRooms.get(channelId);
      if (room && room.has(socket.id)) {
        const participant = room.get(socket.id)!;
        participant.isSpeaking = isSpeaking;
        socket.to(`voice:${channelId}`).emit('webrtc:user_speaking', {
          socketId: socket.id,
          userId,
          isSpeaking,
        });
      }
    });

    // Leave voice channel
    socket.on('webrtc:leave_voice', () => {
      leaveCurrentVoiceRoom(socket);
    });

    // ----------------------------------------------------------------
    // DIRECT 1-ON-1 AND GROUP CALLS (RINGING & CALL MANAGEMENT)
    // ----------------------------------------------------------------

    socket.on('call:initiate', ({ conversationId, targetUserId, callerInfo, callType }: any) => {
      activeCalls.set(conversationId, {
        conversationId,
        callerId: userId,
        receiverId: targetUserId,
        type: callType || 'voice',
      });

      // Ring target user
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        conversationId,
        caller: callerInfo || { id: userId, username: user.username },
        callType: callType || 'voice',
      });
    });

    socket.on('call:accept', ({ conversationId }: { conversationId: string }) => {
      const call = activeCalls.get(conversationId);
      if (call) {
        io.to(`user:${call.callerId}`).emit('call:accepted', { conversationId });
      }
    });

    socket.on('call:reject', ({ conversationId }: { conversationId: string }) => {
      const call = activeCalls.get(conversationId);
      if (call) {
        io.to(`user:${call.callerId}`).emit('call:rejected', { conversationId });
        activeCalls.delete(conversationId);
      }
    });

    socket.on('call:end', ({ conversationId }: { conversationId: string }) => {
      const call = activeCalls.get(conversationId);
      if (call) {
        if (call.receiverId) {
          io.to(`user:${call.receiverId}`).emit('call:ended', { conversationId });
        }
        io.to(`user:${call.callerId}`).emit('call:ended', { conversationId });
        activeCalls.delete(conversationId);
      }
    });

    // ----------------------------------------------------------------
    // DISCONNECT
    // ----------------------------------------------------------------
    socket.on('disconnect', async () => {
      leaveCurrentVoiceRoom(socket);

      if (activeUsers.has(userId)) {
        const userSockets = activeUsers.get(userId)!;
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(userId);
          // Update DB status to offline
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'offline' },
          }).catch(() => {});

          io.emit('user:status_update', {
            userId,
            status: 'offline',
          });
        }
      }
    });
  });

  function leaveCurrentVoiceRoom(socket: AuthenticatedSocket) {
    for (const [channelId, room] of voiceRooms.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);
        socket.leave(`voice:${channelId}`);
        socket.to(`voice:${channelId}`).emit('webrtc:user_left', {
          socketId: socket.id,
          userId: socket.user?.userId,
        });

        io.emit('voice:channel_participants', {
          channelId,
          participants: Array.from(room.values()),
        });

        if (room.size === 0) {
          voiceRooms.delete(channelId);
        }
      }
    }
  }
}
