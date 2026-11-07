import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { Server } from '../../types';
import { X, Upload, Sparkles } from 'lucide-react';

interface CreateServerModalProps {
  onServerCreated: (server: Server) => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({ onServerCreated }) => {
  const { closeModal } = useModal();
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const newServer = await api.post<Server>('/api/servers', {
        name: name.trim(),
        iconUrl: iconUrl.trim() || undefined,
      });

      onServerCreated(newServer);
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to create server');
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

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Create a server</h2>
          <p className="text-xs text-[#949BA4]">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Server Name <span className="text-[#ED4245]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Server"
                className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Server Icon URL (Optional)
              </label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
                className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <div className="pt-2 flex justify-between items-center bg-[#2B2D31] -mx-6 -mb-6 p-4 mt-6">
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-white hover:underline font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
