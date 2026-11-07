import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { playSound } from '../utils/sounds';

interface TypingIndicator {
  userId: string;
  username: string;
  channelId?: string;
  conversationId?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: TypingIndicator[];
  startTyping: (channelId?: string, conversationId?: string) => void;
  stopTyping: (channelId?: string, conversationId?: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;

    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Users presence list
    s.on('users:online_list', (list: string[]) => {
      setOnlineUsers(new Set(list));
    });

    // User status update
    s.on('user:status_update', ({ userId, status }: { userId: string; status: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'offline') {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    });

    // Typing indicators
    s.on('typing:user', ({ userId, username, channelId, conversationId, isTyping }: any) => {
      if (userId === user.id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.some((t) => t.userId === userId && (t.channelId === channelId || t.conversationId === conversationId))) {
            return [...prev, { userId, username, channelId, conversationId }];
          }
          return prev;
        } else {
          return prev.filter((t) => !(t.userId === userId && (t.channelId === channelId || t.conversationId === conversationId)));
        }
      });
    });

    // Notification sounds for new incoming messages if not author
    s.on('message:new', (msg: any) => {
      if (msg.authorId !== user.id) {
        playSound.message();
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id]);

  const startTyping = (channelId?: string, conversationId?: string) => {
    if (socket && isConnected) {
      socket.emit('typing:start', { channelId, conversationId });
    }
  };

  const stopTyping = (channelId?: string, conversationId?: string) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { channelId, conversationId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
