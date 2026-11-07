import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, UserPlus } from 'lucide-react';

interface RegisterViewProps {
  onSwitchToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register(username, email, password, displayName);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#1E1F22] p-4 relative overflow-hidden">
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-discord-blurple/20 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-[#313338] w-full max-w-md p-8 rounded-lg shadow-2xl border border-[#232428] relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-discord-blurple rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-discord-blurple/30">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Create an account</h2>
          <p className="text-[#949BA4] text-sm">Join the community on Discord Clone</p>
        </div>

        {error && (
          <div className="bg-[#ED4245]/20 border border-[#ED4245] text-[#ED4245] p-3 rounded mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
              Email <span className="text-[#ED4245]">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-white focus:outline-none focus:border-discord-blurple transition-colors text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-white focus:outline-none focus:border-discord-blurple transition-colors text-sm"
              placeholder="How others will see you"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
              Username <span className="text-[#ED4245]">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-white focus:outline-none focus:border-discord-blurple transition-colors text-sm"
              placeholder="unique_username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
              Password <span className="text-[#ED4245]">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-white focus:outline-none focus:border-discord-blurple transition-colors text-sm"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-discord-blurple hover:bg-[#4752C4] text-white font-medium py-2.5 rounded transition-colors text-sm disabled:opacity-50 mt-2 shadow-md shadow-discord-blurple/20"
          >
            {isLoading ? 'Creating account...' : 'Continue'}
          </button>
        </form>

        <div className="mt-4 text-xs text-[#949BA4]">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-discord-blurple hover:underline font-medium"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};
