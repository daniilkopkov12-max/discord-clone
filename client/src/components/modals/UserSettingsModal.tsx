import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { UserStatus } from '../../types';
import {
  X,
  User as UserIcon,
  Mic,
  Monitor,
  LogOut,
  Palette,
  Volume2,
} from 'lucide-react';

export const UserSettingsModal: React.FC = () => {
  const { closeModal } = useModal();
  const { user, updateProfile, updateStatus, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'account' | 'voice' | 'appearance'>('account');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customStatus, setCustomStatus] = useState(user?.customStatus || '');
  const [status, setStatus] = useState<UserStatus>(user?.status || 'online');
  const [accentColor, setAccentColor] = useState(user?.settings?.accentColor || '#5865F2');

  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const testStreamRef = useRef<MediaStream | null>(null);

  if (!user) return null;

  // Cleanup test mic on unmount or tab switch
  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = ctx;
      setIsTestingMic(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      alert('Could not access microphone for testing.');
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsTestingMic(false);
    setMicVolume(0);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        customStatus: customStatus.trim() || undefined,
      });
      if (status !== user.status) {
        await updateStatus(status);
      }
      alert('Profile updated successfully!');
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4">
      <div className="bg-[#313338] border border-[#232428] rounded-xl w-full max-w-2xl h-[560px] overflow-hidden shadow-2xl flex relative">
        {/* Left Sidebar */}
        <div className="w-52 bg-[#2B2D31] p-4 flex flex-col justify-between border-r border-[#1F2023]">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider px-2 mb-2">
              User Settings
            </h3>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab('account');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'account'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              <UserIcon className="w-4 h-4" /> My Account
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'voice'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              <Mic className="w-4 h-4" /> Voice & Video
            </button>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab('appearance');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[#3F4147] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              <Palette className="w-4 h-4" /> Appearance
            </button>
          </div>

          <button
            onClick={() => {
              stopMicTest();
              logout();
              closeModal();
            }}
            className="flex items-center gap-2 text-xs text-[#ED4245] hover:underline font-semibold p-2"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 overflow-y-auto relative flex flex-col justify-between">
          <button
            onClick={() => {
              stopMicTest();
              closeModal();
            }}
            className="absolute top-4 right-4 text-[#949BA4] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* MY ACCOUNT TAB */}
          {activeTab === 'account' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 flex-1">
              <h2 className="text-xl font-bold text-white mb-4">My Account</h2>

              <div className="flex items-center gap-4 p-4 bg-[#1E1F22] rounded-lg border border-[#35363C]">
                <img
                  src={
                    avatarUrl ||
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                  }
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="font-bold text-base text-white">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-xs text-[#949BA4]">@{user.username}</div>
                  <div className="text-[11px] text-[#80848E] mt-0.5">{user.email}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Custom Status
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Online Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple"
                >
                  <option value="online">Online</option>
                  <option value="idle">Idle</option>
                  <option value="dnd">Do Not Disturb</option>
                  <option value="offline">Invisible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  About Me (Bio)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1E1F22] border border-[#232428] rounded p-2.5 text-sm text-white focus:outline-none focus:border-discord-blurple resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-discord-blurple hover:bg-[#4752C4] text-white text-xs font-semibold px-6 py-2.5 rounded transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* VOICE & VIDEO TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-6 flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Voice & Video Settings</h2>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Mic Test
                </label>
                <p className="text-xs text-[#949BA4] mb-3">
                  Having mic issues? Click below and say something to test your microphone levels live.
                </p>

                {/* Mic Volume Meter Bar */}
                <div className="h-6 w-full bg-[#1E1F22] rounded-full overflow-hidden p-1 border border-[#35363C] mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-discord-green via-discord-yellow to-discord-red rounded-full transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={isTestingMic ? stopMicTest : startMicTest}
                  className={`px-4 py-2 rounded text-xs font-semibold transition-colors ${
                    isTestingMic
                      ? 'bg-[#ED4245] hover:bg-red-700 text-white'
                      : 'bg-discord-blurple hover:bg-[#4752C4] text-white'
                  }`}
                >
                  {isTestingMic ? 'Stop Testing' : "Let's Check"}
                </button>
              </div>

              <div className="pt-4 border-t border-[#3F4147]">
                <h3 className="text-sm font-semibold text-white mb-1">WebRTC Engine</h3>
                <p className="text-xs text-discord-green font-medium">
                  Active (P2P Mesh with Google STUN Fallback)
                </p>
                <p className="text-[11px] text-[#949BA4] mt-1">
                  Audio echo cancellation, noise suppression, and high-definition video streams are automatically enabled.
                </p>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Appearance</h2>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1E1F22] rounded-lg border-2 border-discord-blurple flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-white">Dark Theme (Default)</span>
                    <span className="w-3 h-3 rounded-full bg-discord-blurple" />
                  </div>
                  <div className="p-4 bg-[#404249] rounded-lg border border-[#35363C] flex items-center justify-between cursor-pointer opacity-50">
                    <span className="text-sm font-bold text-white">Light Theme</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#B5BAC1] tracking-wider mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${
                        accentColor === color ? 'ring-4 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
