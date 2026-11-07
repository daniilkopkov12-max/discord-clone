import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all DM conversations
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const conversations = await prisma.dMConversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Fetch DMs error:', error);
    res.status(500).json({ error: 'Failed to fetch DM conversations' });
  }
});

// Get or create 1-on-1 DM
router.post('/user/:targetUserId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { targetUserId } = req.params;

    if (userId === targetUserId) {
      res.status(400).json({ error: 'Cannot create DM conversation with yourself' });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if 1-on-1 DM already exists
    const existing = await prisma.dMConversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (existing) {
      res.json(existing);
      return;
    }

    // Create new conversation
    const conversation = await prisma.dMConversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create DM error:', error);
    res.status(500).json({ error: 'Failed to create DM conversation' });
  }
});

// Create group DM
router.post('/group', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, userIds } = req.body; // array of userIds

    const allMemberIds = Array.from(new Set([userId, ...(userIds || [])]));

    const conversation = await prisma.dMConversation.create({
      data: {
        isGroup: true,
        name: name?.trim() || 'Group Chat',
        iconUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name || 'group')}`,
        members: {
          create: allMemberIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group DM' });
  }
});

// Get DM messages
router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify membership
    const membership = await prisma.dMMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { dmConversationId: id },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
        replyTo: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
});

// Send DM message
router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { content, attachments, replyToId } = req.body;

    const membership = await prisma.dMMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        dmConversationId: id,
        authorId: userId,
        content: content?.trim() || '',
        replyToId: replyToId || null,
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            url: att.url,
            filename: att.filename || 'attachment',
            size: att.size || 0,
            contentType: att.contentType || 'application/octet-stream',
          })),
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        attachments: true,
        reactions: true,
        replyTo: {
          include: {
            author: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    // Update conversation updatedAt
    await prisma.dMConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send DM message' });
  }
});

export default router;
