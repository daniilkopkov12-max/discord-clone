import React from 'react';
import { ServerMember, Role } from '../../types';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { Shield, Crown } from 'lucide-react';

interface MemberSidebarProps {
  members: ServerMember[];
  roles: Role[];
  ownerId: string;
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({
  members,
  roles,
  ownerId,
}) => {
  const { onlineUsers } = useSocket();
  const { openModal } = useModal();

  // Group members into Online and Offline
  const onlineMembers: ServerMember[] = [];
  const offlineMembers: ServerMember[] = [];

  members.forEach((m) => {
    const isOnline = onlineUsers.has(m.userId) || m.user.status !== 'offline';
    if (isOnline) {
      onlineMembers.push(m);
    } else {
      offlineMembers.push(m);
    }
  });

  const getStatusColor = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'bg-[#80848E]';
    switch (status) {
      case 'idle':
        return 'bg-[#F0B232]';
      case 'dnd':
        return 'bg-[#F23F43]';
      default:
        return 'bg-[#23A55A]';
    }
  };

  return (
    <aside className="w-60 h-screen bg-[#2B2D31] select-none flex-shrink-0 z-10 border-l border-[#1F2023]/40 overflow-y-auto px-4 py-6 hidden lg:block">
      {/* Online Group */}
      {onlineMembers.length > 0 && (
        <div className="mb-6 space-y-1">
          <h3 className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1">
            Online — {onlineMembers.length}
          </h3>
          {onlineMembers.map((member) => renderMember(member, true))}
        </div>
      )}

      {/* Offline Group */}
      {offlineMembers.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1">
            Offline — {offlineMembers.length}
          </h3>
          {offlineMembers.map((member) => renderMember(member, false))}
        </div>
      )}
    </aside>
  );

  function renderMember(member: ServerMember, isOnline: boolean) {
    const isOwner = member.userId === ownerId;

    return (
      <button
        key={member.id}
        onClick={() => openModal('userProfile', { user: member.user, userId: member.userId })}
        className={`w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#35373C] transition-colors group text-left ${
          !isOnline ? 'opacity-60 hover:opacity-100' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <img
            src={
              member.user.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user.username}`
            }
            alt={member.nickname || member.user.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#2B2D31] ${getStatusColor(
              member.user.status,
              isOnline
            )}`}
          />
        </div>

        <div className="overflow-hidden flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold truncate"
              style={{ color: member.role?.color || '#DBDEE1' }}
            >
              {member.nickname || member.user.displayName || member.user.username}
            </span>
            {isOwner && (
              <Crown className="w-3.5 h-3.5 text-discord-yellow flex-shrink-0" />
            )}
          </div>
          {member.user.customStatus && (
            <div className="text-[10px] text-[#949BA4] truncate">
              {member.user.customStatus}
            </div>
          )}
        </div>
      </button>
    );
  }
};
