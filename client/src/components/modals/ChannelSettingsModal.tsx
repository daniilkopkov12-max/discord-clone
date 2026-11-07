import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { X, Trash2 } from 'lucide-react';

interface ChannelSettingsModalProps {
  onChannelUpdated: () => void;
  onChannelDeleted: (channelId: string) => void;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  onChannelUpdated,
  onChannelDeleted,
}) => {
  const { closeModal, modalData } = useModal();
  const channel = modalData.channel;

  const [name, setName] = useState(channel?.name || '');
  const [topic, setTopic] = useState(channel?.topic || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!channel) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await api.patch(`/api/channels/${channel.id}`, {
        name: name.trim(),
        topic: topic.trim() || null,
      });

      onChannelUpdated();
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to update channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete #${channel.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/channels/${channel.id}`);
      onChannelDeleted(channel.id);
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to delete channel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-[#949BA4] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Channel Overview</h2>

          <form onSubmit={handleUpdate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Channel Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
              />
            </div>

            {channel.type === 'TEXT' && (
              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Channel Topic
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Let everyone know how to use this channel!"
                  rows={3}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple resize-none"
                />
              </div>
            )}

            <div className="pt-4 border-t border-[#3F4147] flex items-center justify-between">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs text-[#ED4245] hover:underline font-semibold"
              >
                <Trash2 className="w-4 h-4" /> Delete Channel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-xs text-white hover:underline px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
