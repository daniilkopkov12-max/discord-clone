export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserSettings {
  id: string;
  userId: string;
  theme: string;
  accentColor: string;
  soundEnabled: boolean;
  inputDeviceId?: string;
  outputDeviceId?: string;
  videoDeviceId?: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  status: UserStatus;
  customStatus?: string;
  settings?: UserSettings;
  createdAt?: string;
}

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: string;
  hoist: boolean;
  position: number;
  permissions: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  nickname?: string;
  roleId?: string;
  joinedAt: string;
  user: User;
  role?: Role;
}

export interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
}

export interface Channel {
  id: string;
  serverId: string;
  categoryId?: string | null;
  name: string;
  type: 'TEXT' | 'VOICE';
  topic?: string | null;
  position: number;
  isPrivate: boolean;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  inviteCode: string;
  ownerId: string;
  channels: Channel[];
  categories: Category[];
  roles: Role[];
  members: ServerMember[];
}

export interface Attachment {
  id: string;
  messageId: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface Message {
  id: string;
  channelId?: string;
  dmConversationId?: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  isEdited: boolean;
  replyToId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: User;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: {
    id: string;
    content: string;
    author: {
      id: string;
      username: string;
      displayName: string;
    };
  } | null;
}

export interface DMMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  user: User;
}

export interface DMConversation {
  id: string;
  isGroup: boolean;
  name?: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
  members: DMMember[];
  messages?: Message[];
}

export interface Friendship {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  isOutgoing: boolean;
  user: User;
  createdAt: string;
}

export interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}
