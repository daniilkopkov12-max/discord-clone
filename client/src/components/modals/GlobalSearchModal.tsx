import React, { useState, useEffect } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { Search, Hash, Server as ServerIcon, User as UserIcon, MessageSquare, X } from 'lucide-react';

interface GlobalSearchModalProps {
  onSelectChannel: (serverId: string, channelId: string) => void;
  onSelectUser: (userId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  onSelectChannel,
  onSelectUser,
}) => {
  const { closeModal } = useModal();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    messages: any[];
    channels: any[];
    servers: any[];
    users: any[];
  }>({ messages: [], channels: [], servers: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ messages: [], channels: [], servers: [], users: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-[#232428] flex items-center gap-2 bg-[#1E1F22]">
          <Search className="w-5 h-5 text-[#949BA4] ml-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, channels, servers, users..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-[#80848E]"
            autoFocus
          />
          <button
            onClick={closeModal}
            className="text-[#949BA4] hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="text-center py-6 text-xs text-[#949BA4]">Searching...</div>
          )}

          {/* Channels */}
          {results.channels.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1">
                Channels
              </div>
              <div className="space-y-0.5">
                {results.channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectChannel(c.serverId, c.id);
                      closeModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#35373C] text-xs text-white text-left transition-colors"
                  >
                    <Hash className="w-4 h-4 text-[#80848E]" />
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-[10px] text-[#949BA4] ml-auto">
                      in {c.server?.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1">
                Users
              </div>
              <div className="space-y-0.5">
                {results.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u.id);
                      closeModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-[#35373C] text-xs text-white text-left transition-colors"
                  >
                    <img
                      src={
                        u.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`
                      }
                      alt={u.username}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-semibold">{u.displayName || u.username}</span>
                    <span className="text-[10px] text-[#949BA4]">@{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-1">
                Messages
              </div>
              <div className="space-y-1">
                {results.messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded bg-[#1E1F22] border border-[#232428] text-xs text-[#DBDEE1]"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-white mb-0.5">
                      <span>{m.author.displayName || m.author.username}</span>
                      <span className="text-[10px] text-[#949BA4]">
                        in #{m.channel?.name}
                      </span>
                    </div>
                    <p className="line-clamp-2">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading &&
            query.length >= 2 &&
            results.channels.length === 0 &&
            results.users.length === 0 &&
            results.messages.length === 0 && (
              <div className="text-center py-8 text-xs text-[#949BA4]">
                No results found for "{query}"
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
