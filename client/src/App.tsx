import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WebRTCProvider } from './context/WebRTCContext';
import { ModalProvider, useModal } from './context/ModalContext';
import { Server, Channel } from './types';
import { api } from './utils/api';

import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { ServerSidebar } from './components/layout/ServerSidebar';
import { ChannelSidebar } from './components/layout/ChannelSidebar';
import { ChatArea } from './components/layout/ChatArea';
import { MemberSidebar } from './components/layout/MemberSidebar';
import { VoiceChannelView } from './components/voice/VoiceChannelView';
import { DMView } from './components/dm/DMView';
import { IncomingCallModal } from './components/voice/IncomingCallModal';

import { CreateServerModal } from './components/modals/CreateServerModal';
import { JoinServerModal } from './components/modals/JoinServerModal';
import { ServerSettingsModal } from './components/modals/ServerSettingsModal';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { ChannelSettingsModal } from './components/modals/ChannelSettingsModal';
import { UserSettingsModal } from './components/modals/UserSettingsModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { UserProfileModal } from './components/modals/UserProfileModal';

const DiscordApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeModal, openModal } = useModal();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(true);

  // Load user servers
  const loadServers = async () => {
    try {
      const list = await api.get<Server[]>('/api/servers');
      setServers(list);

      // Default to first server and its first general channel if available
      if (list.length > 0 && activeServerId === null && window.location.search.length === 0) {
        setActiveServerId(list[0].id);
        const generalCh = list[0].channels.find((c) => c.name === 'general') || list[0].channels[0];
        if (generalCh) {
          setActiveChannelId(generalCh.id);
        }
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadServers();

      // Check if user opened an invite link (?invite=nexus123)
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      if (invite) {
        api
          .post<Server>('/api/servers/join', { inviteCode: invite })
          .then((joined) => {
            loadServers();
            setActiveServerId(joined.id);
            if (joined.channels[0]) setActiveChannelId(joined.channels[0].id);
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch(() => {});
      }
    }
  }, [user]);

  // Global Ctrl+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openModal('globalSearch');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#1E1F22] text-white">
        <div className="w-12 h-12 border-4 border-discord-blurple border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-semibold tracking-wide text-[#949BA4]">
          Connecting to Discord Clone...
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login or Register
  if (!user) {
    return authView === 'login' ? (
      <LoginView onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterView onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // Active Server & Channel object
  const activeServer = servers.find((s) => s.id === activeServerId);
  const activeChannel = activeServer?.channels.find((c) => c.id === activeChannelId);

  const handleSelectServer = (serverId: string | null) => {
    setActiveServerId(serverId);
    if (serverId) {
      const server = servers.find((s) => s.id === serverId);
      if (server && server.channels.length > 0) {
        const textCh = server.channels.find((c) => c.type === 'TEXT') || server.channels[0];
        setActiveChannelId(textCh.id);
      } else {
        setActiveChannelId(null);
      }
    } else {
      setActiveChannelId(null);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#1E1F22] select-none font-sans">
      {/* 1. Leftmost Server Rail */}
      <ServerSidebar
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={handleSelectServer}
      />

      {/* 2. Channel & Main Stage View */}
      {activeServerId === null || !activeServer ? (
        /* Direct Messages / Friends View */
        <DMView />
      ) : (
        /* Server View */
        <div className="flex-1 h-screen flex overflow-hidden">
          {/* Server Channels Sidebar */}
          <ChannelSidebar
            server={activeServer}
            activeChannelId={activeChannelId}
            onSelectChannel={(chId) => setActiveChannelId(chId)}
            onRefreshServer={loadServers}
          />

          {/* Central Channel Stage */}
          {activeChannel ? (
            activeChannel.type === 'VOICE' ? (
              /* Voice & Video Stage */
              <VoiceChannelView channel={activeChannel} />
            ) : (
              /* Text Chat Area */
              <ChatArea
                channel={activeChannel}
                isMembersOpen={isMembersOpen}
                onToggleMembers={() => setIsMembersOpen(!isMembersOpen)}
              />
            )
          ) : (
            <div className="flex-1 bg-[#313338] flex items-center justify-center text-sm text-[#949BA4]">
              Select or create a channel to get started
            </div>
          )}

          {/* Right Member List Sidebar (for text channels) */}
          {activeChannel?.type === 'TEXT' && isMembersOpen && (
            <MemberSidebar
              members={activeServer.members}
              roles={activeServer.roles}
              ownerId={activeServer.ownerId}
            />
          )}
        </div>
      )}

      {/* Global Modals */}
      {activeModal === 'createServer' && (
        <CreateServerModal
          onServerCreated={(newServer) => {
            setServers((prev) => [...prev, newServer]);
            handleSelectServer(newServer.id);
          }}
        />
      )}

      {activeModal === 'joinServer' && (
        <JoinServerModal
          onServerJoined={(joinedServer) => {
            loadServers();
            handleSelectServer(joinedServer.id);
          }}
        />
      )}

      {activeModal === 'serverSettings' && (
        <ServerSettingsModal
          onServerUpdated={loadServers}
          onServerDeleted={(serverId) => {
            setServers((prev) => prev.filter((s) => s.id !== serverId));
            handleSelectServer(null);
          }}
        />
      )}

      {activeModal === 'createChannel' && (
        <CreateChannelModal
          onChannelCreated={(newCh) => {
            loadServers();
            setActiveChannelId(newCh.id);
          }}
        />
      )}

      {activeModal === 'channelSettings' && (
        <ChannelSettingsModal
          onChannelUpdated={loadServers}
          onChannelDeleted={() => {
            loadServers();
            if (activeServer && activeServer.channels.length > 0) {
              setActiveChannelId(activeServer.channels[0].id);
            }
          }}
        />
      )}

      {activeModal === 'userSettings' && <UserSettingsModal />}

      {activeModal === 'globalSearch' && (
        <GlobalSearchModal
          onSelectChannel={(srvId, chId) => {
            setActiveServerId(srvId);
            setActiveChannelId(chId);
          }}
          onSelectUser={(uId) => {
            setActiveServerId(null);
          }}
        />
      )}

      {activeModal === 'userProfile' && (
        <UserProfileModal
          onOpenDM={(targetUserId) => {
            setActiveServerId(null);
          }}
        />
      )}

      {/* Global Incoming Direct Call popup */}
      <IncomingCallModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <WebRTCProvider>
          <ModalProvider>
            <DiscordApp />
          </ModalProvider>
        </WebRTCProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
