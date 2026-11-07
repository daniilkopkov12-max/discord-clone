import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { X, Trash2, Copy, Shield, Users } from 'lucide-react';

interface ServerSettingsModalProps {
  onServerUpdated: () => void;
  onServerDeleted: (serverId: string) => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  onServerUpdated,
  onServerDeleted,
}) => {
  const { closeModal, modalData } = useModal();
  const server = modalData.server;

  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members'>('overview');
  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [iconUrl, setIconUrl] = useState(server?.iconUrl || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!server) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await api.patch(`/api/servers/${server.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        iconUrl: iconUrl.trim() || null,
      });

      onServerUpdated();
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to update server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteServer = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${server.name}? This will permanently delete all channels and messages.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/api/servers/${server.id}`);
      onServerDeleted(server.id);
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to delete server');
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!confirm('Kick this member from the server?')) return;
    try {
      await api.delete(`/api/servers/${server.id}/members/${memberId}`);
      onServerUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to kick member');
    }
  };

  const handleCopyInvite = () => {
    const invite = `${window.location.origin}?invite=${server.inviteCode}`;
    navigator.clipboard.writeText(invite);
    alert(`Invite copied: ${invite}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-2xl h-[560px] overflow-hidden shadow-2xl flex relative">
        {/* Left Settings Sidebar */}
        <div className="w-52 bg-[#2B2D31] p-4 flex flex-col justify-between border-r border-[#1F2023]">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-2">
              {server.name}
            </h3>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'roles'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              Roles ({server.roles.length})
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              Members ({server.members.length})
            </button>
          </div>

          <button
            onClick={handleDeleteServer}
            className="flex items-center gap-1.5 text-xs text-[#ED4245] hover:underline font-semibold p-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Server
          </button>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 p-6 overflow-y-auto relative flex flex-col justify-between">
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-[#949BA4] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <form onSubmit={handleUpdate} className="space-y-4 flex-1">
              <h2 className="text-xl font-bold text-white mb-4">Server Overview</h2>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Server Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Server Icon URL
                </label>
                <input
                  type="url"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Instant Invite Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={server.inviteCode}
                    className="bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-xs text-discord-blurple font-mono flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-4 py-2.5 rounded transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* ROLES TAB */}
          {activeTab === 'roles' && (
            <div className="space-y-3 flex-1 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-2">Roles & Permissions</h2>
              <p className="text-xs text-[#949BA4] mb-4">
                Use roles to organize your server members and customize their permissions.
              </p>

              <div className="space-y-2">
                {server.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-[#1E1F22] rounded-lg border border-[#35363C]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <div>
                        <div className="font-semibold text-sm text-white">{role.name}</div>
                        <div className="text-[10px] text-[#949BA4] font-mono">
                          {role.permissions}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-3 flex-1 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-2">
                Server Members ({server.members.length})
              </h2>

              <div className="space-y-2">
                {server.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 bg-[#1E1F22] rounded-lg border border-[#35363C]"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          member.user.avatarUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user.username}`
                        }
                        alt={member.user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-xs text-white">
                          {member.nickname || member.user.displayName || member.user.username}
                        </div>
                        <div className="text-[10px] text-[#949BA4]">
                          Role: {member.role?.name || 'Member'}
                        </div>
                      </div>
                    </div>

                    {member.userId !== server.ownerId && (
                      <button
                        onClick={() => handleKickMember(member.id)}
                        className="text-xs text-[#ED4245] hover:underline font-semibold"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
