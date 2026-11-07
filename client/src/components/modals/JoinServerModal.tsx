import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { Server } from '../../types';
import { X, Compass } from 'lucide-react';

interface JoinServerModalProps {
  onServerJoined: (server: Server) => void;
}

export const JoinServerModal: React.FC<JoinServerModalProps> = ({ onServerJoined }) => {
  const { closeModal } = useModal();
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const server = await api.post<Server>('/api/servers/join', {
        inviteCode: inviteCode.trim(),
      });
      onServerJoined(server);
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to join server');
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
          <div className="w-12 h-12 bg-discord-blurple/20 rounded-full flex items-center justify-center mx-auto mb-3 text-discord-blurple">
            <Compass className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Join a Server</h2>
          <p className="text-xs text-[#949BA4]">
            Enter an invite below to join an existing server. (Demo invite code:{' '}
            <span className="text-white font-semibold">nexus123</span>)
          </p>

          {error && (
            <div className="mt-4 bg-[#ED4245]/20 border border-[#ED4245] text-[#ED4245] p-2.5 rounded text-xs font-medium text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                Invite Code or Link <span className="text-[#ED4245]">*</span>
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="nexus123 or https://render-app.onrender.com/?invite=nexus123"
                className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple font-mono text-xs"
                autoFocus
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
                disabled={isLoading || !inviteCode.trim()}
                className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Server'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
