import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.reaction.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.dMMember.deleteMany({});
  await prisma.dMConversation.deleteMany({});
  await prisma.serverMember.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.userSettings.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const user1 = await prisma.user.create({
    data: {
      username: 'alexdev',
      displayName: 'Alex Rivers',
      email: 'alex@discord.local',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
      bio: 'Full-stack developer building real-time apps. Avid gamer & synth lover.',
      status: 'online',
      customStatus: '🚀 Coding the future',
      settings: {
        create: {
          theme: 'dark',
          accentColor: '#5865F2',
          soundEnabled: true,
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: 'sarahtech',
      displayName: 'Sarah Connor',
      email: 'sarah@discord.local',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
      bio: 'UI/UX designer & audio enthusiast. WebRTC tester.',
      status: 'online',
      customStatus: '🎧 Listening to Lo-Fi',
      settings: {
        create: {
          theme: 'dark',
          accentColor: '#57F287',
          soundEnabled: true,
        },
      },
    },
  });

  console.log('👤 Users created: AlexDev and SarahTech');

  // 2. Create Server "Nexus Lounge"
  const server = await prisma.server.create({
    data: {
      name: 'Nexus Lounge',
      description: 'Official community hub for developers, gamers, and voice chats!',
      iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop',
      inviteCode: 'nexus123',
      ownerId: user1.id,
      roles: {
        create: [
          {
            name: 'Admin',
            color: '#ED4245',
            position: 1,
            permissions: 'ADMINISTRATOR',
          },
          {
            name: 'Moderator',
            color: '#5865F2',
            position: 2,
            permissions: 'MANAGE_CHANNELS,KICK_MEMBERS,SEND_MESSAGES,CONNECT_VOICE,SPEAK_VOICE',
          },
          {
            name: 'Member',
            color: '#57F287',
            position: 3,
            permissions: 'SEND_MESSAGES,ADD_REACTIONS,ATTACH_FILES,CONNECT_VOICE,SPEAK_VOICE,STREAM_VIDEO',
          },
        ],
      },
      categories: {
        create: [
          { name: 'WELCOME & RULES', position: 0 },
          { name: 'TEXT CHANNELS', position: 1 },
          { name: 'VOICE ROOMS', position: 2 },
        ],
      },
    },
    include: {
      roles: true,
      categories: true,
    },
  });

  const catWelcome = server.categories.find((c) => c.name === 'WELCOME & RULES')!;
  const catText = server.categories.find((c) => c.name === 'TEXT CHANNELS')!;
  const catVoice = server.categories.find((c) => c.name === 'VOICE ROOMS')!;

  const roleAdmin = server.roles.find((r) => r.name === 'Admin')!;
  const roleMod = server.roles.find((r) => r.name === 'Moderator')!;

  // 3. Channels
  const chWelcome = await prisma.channel.create({
    data: {
      serverId: server.id,
      categoryId: catWelcome.id,
      name: 'welcome',
      type: 'TEXT',
      topic: 'Welcome to the Discord Clone!',
      position: 0,
    },
  });

  const chGeneral = await prisma.channel.create({
    data: {
      serverId: server.id,
      categoryId: catText.id,
      name: 'general',
      type: 'TEXT',
      topic: 'General conversation, hangout, and friendly banter',
      position: 0,
    },
  });

  const chMedia = await prisma.channel.create({
    data: {
      serverId: server.id,
      categoryId: catText.id,
      name: 'media-share',
      type: 'TEXT',
      topic: 'Share screenshots, photos, and music',
      position: 1,
    },
  });

  await prisma.channel.create({
    data: {
      serverId: server.id,
      categoryId: catVoice.id,
      name: 'General Voice',
      type: 'VOICE',
      position: 0,
    },
  });

  await prisma.channel.create({
    data: {
      serverId: server.id,
      categoryId: catVoice.id,
      name: 'Gaming & Chill',
      type: 'VOICE',
      position: 1,
    },
  });

  // 4. Server Members
  await prisma.serverMember.create({
    data: {
      serverId: server.id,
      userId: user1.id,
      roleId: roleAdmin.id,
    },
  });

  await prisma.serverMember.create({
    data: {
      serverId: server.id,
      userId: user2.id,
      roleId: roleMod.id,
    },
  });

  // 5. Initial Messages
  const msg1 = await prisma.message.create({
    data: {
      channelId: chGeneral.id,
      authorId: user1.id,
      content: 'Hey everyone! Welcome to our Discord Clone 🚀 Real-time WebSockets, WebRTC voice & video calls, screen share and full chat are live!',
      isPinned: true,
    },
  });

  await prisma.reaction.create({
    data: {
      messageId: msg1.id,
      userId: user1.id,
      emoji: '🔥',
    },
  });

  await prisma.reaction.create({
    data: {
      messageId: msg1.id,
      userId: user2.id,
      emoji: '🚀',
    },
  });

  await prisma.message.create({
    data: {
      channelId: chGeneral.id,
      authorId: user2.id,
      content: 'This interface is so smooth! The dark theme, glowing voice indicators, and crystal clear WebRTC calls are incredible.',
      replyToId: msg1.id,
    },
  });

  // 6. Direct Message conversation between Alex and Sarah
  const dmConv = await prisma.dMConversation.create({
    data: {
      isGroup: false,
      members: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      dmConversationId: dmConv.id,
      authorId: user2.id,
      content: 'Hey Alex! Ready to test the voice and video call?',
    },
  });

  // 7. Friendship
  await prisma.friendship.create({
    data: {
      senderId: user1.id,
      receiverId: user2.id,
      status: 'ACCEPTED',
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
