import React, { useState, useEffect } from 'react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../utils/api';
import { User } from '../../types';
import { X, MessageSquare, UserPlus } from 'lucide-react';

interface UserProfileModalProps {
  onOpenDM: (targetUserId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onOpenDM }) => {
  const { closeModal, modalData } = useModal();
  const [profile, setProfile] = useState<User | null>(modalData.user || null);

  useEffect(() => {
    if (modalData.userId && !profile) {
      api.get<User>(`/api/users/${modalData.userId}`).then((u) => setProfile(u));
    }
  }, [modalData.userId]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#2B2D31] border border-[#232428] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/40 rounded-full p-1 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Banner */}
        <div
          className="h-28 w-full bg-discord-blurple"
          style={{
            backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
            backgroundSize: 'cover',
          }}
        />

        {/* Avatar with status */}
        <div className="px-6 relative -mt-12 flex justify-between items-end mb-4">
          <div className="relative">
            <img
              src={
                profile.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`
              }
              alt={profile.displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-[#2B2D31] bg-[#1E1F22]"
            />
            <span
              className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-[#2B2D31] ${
                profile.status === 'online'
                  ? 'bg-[#23A55A]'
                  : profile.status === 'idle'
                  ? 'bg-[#F0B232]'
                  : profile.status === 'dnd'
                  ? 'bg-[#F23F43]'
                  : 'bg-[#80848E]'
              }`}
            />
          </div>

          <button
            onClick={() => {
              onOpenDM(profile.id);
              closeModal();
            }}
            className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-4 py-2 rounded transition-colors flex items-center gap-1.5 shadow"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Send Message
          </button>
        </div>

        {/* User Details */}
        <div className="p-6 pt-0 bg-[#111214] mx-4 mb-4 rounded-xl border border-[#232428]">
          <div className="pt-3">
            <h2 className="text-lg font-bold text-white leading-tight">
              {profile.displayName || profile.username}
            </h2>
            <div className="text-xs text-[#949BA4]">@{profile.username}</div>
          </div>

          {profile.customStatus && (
            <div className="mt-3 text-xs text-white bg-[#1E1F22] p-2 rounded border border-[#35363C]">
              {profile.customStatus}
            </div>
          )}

          {profile.bio && (
            <div className="mt-3 pt-3 border-t border-[#35363C]/60">
              <div className="text-[10px] font-bold text-[#949BA4] uppercase tracking-wider mb-1">
                About Me
              </div>
              <p className="text-xs text-[#DBDEE1] leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
