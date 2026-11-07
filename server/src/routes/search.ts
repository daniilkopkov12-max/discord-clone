import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Global search
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string)?.trim().toLowerCase();
    const userId = req.user!.userId;

    if (!query || query.length < 2) {
      res.json({ messages: [], channels: [], servers: [], users: [] });
      return;
    }

    // 1. Search messages in channels user belongs to
    const messages = await prisma.message.findMany({
      where: {
        content: { contains: query },
        channel: {
          server: {
            members: { some: { userId } },
          },
        },
      },
      take: 15,
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        channel: {
          select: { id: true, name: true, serverId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Search channels
    const channels = await prisma.channel.findMany({
      where: {
        name: { contains: query },
        server: {
          members: { some: { userId } },
        },
      },
      take: 10,
      include: {
        server: {
          select: { id: true, name: true, iconUrl: true },
        },
      },
    });

    // 3. Search servers user is member of or public
    const servers = await prisma.server.findMany({
      where: {
        name: { contains: query },
      },
      take: 10,
      select: {
        id: true,
        name: true,
        iconUrl: true,
        description: true,
        inviteCode: true,
      },
    });

    // 4. Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { displayName: { contains: query } },
        ],
      },
      take: 10,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });

    res.json({ messages, channels, servers, users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
