import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Shield, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onSwitchToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await login(user, pass);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#1E1F22] p-4 relative overflow-hidden">
      {/* Background Discord decorative shapes */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-discord-blurple/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-discord-green/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-[#313338] w-full max-w-md p-8 rounded-lg shadow-2xl border border-[#232428] relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-discord-blurple rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-discord-blurple/30">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Welcome back!</h2>
          <p className="text-[#949BA4] text-sm">We're so excited to see you again!</p>
        </div>

        {error && (
          <div className="bg-[#ED4245]/20 border border-[#ED4245] text-[#ED4245] p-3 rounded mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
              Email or Username <span className="text-[#ED4245]">*</span>
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-white focus:outline-none focus:border-discord-blurple transition-colors text-sm"
              placeholder="alexdev or alex@discord.local"
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
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-xs text-[#949BA4]">
          Need an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-discord-blurple hover:underline font-medium"
          >
            Register
          </button>
        </div>

        {/* Quick Demo Switcher */}
        <div className="mt-6 pt-6 border-t border-[#3F4147]">
          <div className="flex items-center gap-1.5 text-xs text-[#B5BAC1] font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-discord-yellow" />
            <span>Instant Test Accounts (1-Click Login):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alexdev', 'Password123!')}
              className="bg-[#2B2D31] hover:bg-[#35373C] text-xs py-2 px-3 rounded text-left border border-[#3F4147] transition-all flex items-center gap-2 group"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop"
                alt="Alex"
                className="w-6 h-6 rounded-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="overflow-hidden">
                <div className="font-bold text-white truncate">AlexDev</div>
                <div className="text-[10px] text-[#949BA4]">Host / Admin</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('sarahtech', 'Password123!')}
              className="bg-[#2B2D31] hover:bg-[#35373C] text-xs py-2 px-3 rounded text-left border border-[#3F4147] transition-all flex items-center gap-2 group"
            >
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&h=50&fit=crop"
                alt="Sarah"
                className="w-6 h-6 rounded-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="overflow-hidden">
                <div className="font-bold text-white truncate">SarahTech</div>
                <div className="text-[10px] text-[#949BA4]">Peer / Mod</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
