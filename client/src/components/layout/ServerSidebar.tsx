import React from 'react';
import { Server } from '../../types';
import { useModal } from '../../context/ModalContext';
import { MessageSquare, Plus, Compass } from 'lucide-react';

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (serverId: string | null) => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  activeServerId,
  onSelectServer,
}) => {
  const { openModal } = useModal();

  const isDMsActive = activeServerId === null;

  return (
    <nav className="w-[72px] h-screen bg-[#1E1F22] flex flex-col items-center py-3 select-none flex-shrink-0 z-30 space-y-2 overflow-y-auto overflow-x-hidden">
      {/* Home / Direct Messages button */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Left active pill */}
        <div
          className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
            isDMsActive
              ? 'h-10'
              : 'h-0 group-hover:h-5'
          }`}
        />

        <button
          onClick={() => onSelectServer(null)}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-200 ${
            isDMsActive
              ? 'bg-discord-blurple rounded-[16px] text-white shadow-lg shadow-discord-blurple/30'
              : 'bg-[#313338] text-[#DBDEE1] rounded-[24px] hover:rounded-[16px] hover:bg-discord-blurple hover:text-white'
          }`}
          title="Direct Messages"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-[2px] bg-[#35363C] rounded my-1" />

      {/* Servers list */}
      <div className="flex flex-col space-y-2 w-full items-center">
        {servers.map((server) => {
          const isActive = activeServerId === server.id;
          const initials = server.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Left active indicator pill */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive
                    ? 'h-10'
                    : 'h-0 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => onSelectServer(server.id)}
                className={`w-12 h-12 flex items-center justify-center transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? 'rounded-[16px] ring-2 ring-discord-blurple'
                    : 'rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-discord-blurple'
                }`}
                title={server.name}
              >
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt={server.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-sm text-white">{initials}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Server Button */}
      <div className="relative group flex items-center justify-center w-full pt-1">
        <button
          onClick={() => openModal('createServer')}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-discord-green text-discord-green hover:text-white flex items-center justify-center transition-all duration-200"
          title="Add a Server"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Explore / Join Public Servers */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={() => openModal('joinServer')}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-discord-blurple text-discord-blurple hover:text-white flex items-center justify-center transition-all duration-200"
          title="Join Server by Invite"
        >
          <Compass className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
};
