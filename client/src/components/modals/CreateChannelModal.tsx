import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { Channel } from '../../types';
import { X, Hash, Volume2 } from 'lucide-react';

interface CreateChannelModalProps {
  onChannelCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onChannelCreated }) => {
  const { closeModal, modalData } = useModal();
  const server = modalData.server;
  const initialCategory = modalData.category;

  const [type, setType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState<string>(initialCategory?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!server) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const newChannel = await api.post<Channel>(`/api/channels/server/${server.id}`, {
        name: name.trim(),
        type,
        topic: topic.trim() || undefined,
        categoryId: categoryId || undefined,
      });

      onChannelCreated(newChannel);
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to create channel');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
          <p className="text-xs text-[#949BA4] mb-4">
            in {initialCategory ? initialCategory.name : server.name}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Channel Type Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Channel Type
              </label>
              <div className="space-y-2">
                {/* Text Channel Option */}
                <div
                  onClick={() => setType('TEXT')}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                    type === 'TEXT'
                      ? 'bg-[#3F4147] border-discord-blurple'
                      : 'bg-[#2B2D31] border-[#232428] hover:bg-[#35373C]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Hash className="w-6 h-6 text-[#949BA4]" />
                    <div>
                      <div className="font-semibold text-sm text-white">Text</div>
                      <div className="text-[11px] text-[#949BA4]">
                        Post messages, images, memes, and opinions
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={type === 'TEXT'}
                    onChange={() => setType('TEXT')}
                    className="accent-discord-blurple"
                  />
                </div>

                {/* Voice Channel Option */}
                <div
                  onClick={() => setType('VOICE')}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition-colors ${
                    type === 'VOICE'
                      ? 'bg-[#3F4147] border-discord-blurple'
                      : 'bg-[#2B2D31] border-[#232428] hover:bg-[#35373C]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-6 h-6 text-[#949BA4]" />
                    <div>
                      <div className="font-semibold text-sm text-white">Voice</div>
                      <div className="text-[11px] text-[#949BA4]">
                        Hang out together with voice, video, and screen share
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={type === 'VOICE'}
                    onChange={() => setType('VOICE')}
                    className="accent-discord-blurple"
                  />
                </div>
              </div>
            </div>

            {/* Channel Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Channel Name <span className="text-[#ED4245]">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-[#949BA4]">
                  {type === 'TEXT' ? '#' : <Volume2 className="w-4 h-4" />}
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="new-channel"
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 pl-8 text-sm text-white focus:outline-none focus:border-discord-blurple"
                  autoFocus
                />
              </div>
            </div>

            {/* Category selection */}
            {server.categories.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                >
                  <option value="">No Category</option>
                  {server.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center bg-[#2B2D31] -mx-6 -mb-6 p-4 mt-6">
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-white hover:underline font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
