import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { hasPermission, Permissions } from '../utils/permissions.js';

const router = Router();

// Get channel messages
router.get('/:channelId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string;

    const messages = await prisma.message.findMany({
      where: { channelId },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
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

    // Reverse to send chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to channel
router.post('/:channelId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const { content, attachments, replyToId } = req.body;
    const userId = req.user!.userId;

    if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: { where: { userId }, include: { role: true } },
          },
        },
      },
    });

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const member = channel.server.members[0];
    if (!member) {
      res.status(403).json({ error: 'You are not a member of this server' });
      return;
    }

    const isOwner = channel.server.ownerId === userId;
    const canSend = hasPermission(member.role?.permissions, Permissions.SEND_MESSAGES, isOwner);
    if (!canSend) {
      res.status(403).json({ error: 'Permission denied: Send Messages required' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        channelId,
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

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit message
router.patch('/message/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageId = req.params.id;
    const { content } = req.body;
    const userId = req.user!.userId;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (message.authorId !== userId) {
      res.status(403).json({ error: 'Only author can edit this message' });
      return;
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
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

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/message/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageId = req.params.id;
    const userId = req.user!.userId;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            server: {
              include: {
                members: { where: { userId }, include: { role: true } },
              },
            },
          },
        },
      },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const isAuthor = message.authorId === userId;
    let canDelete = isAuthor;

    if (!canDelete && message.channel?.server) {
      const isOwner = message.channel.server.ownerId === userId;
      const member = message.channel.server.members[0];
      canDelete = hasPermission(member?.role?.permissions, Permissions.ADMINISTRATOR, isOwner) ||
                  hasPermission(member?.role?.permissions, 'DELETE_MESSAGES', isOwner);
    }

    if (!canDelete) {
      res.status(403).json({ error: 'Permission denied: Cannot delete this message' });
      return;
    }

    await prisma.message.delete({ where: { id: messageId } });
    res.json({ message: 'Message deleted', messageId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Toggle reaction
router.post('/message/:id/reactions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageId = req.params.id;
    const { emoji } = req.body;
    const userId = req.user!.userId;

    if (!emoji) {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction if already added
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
      res.json({ action: 'removed', emoji, messageId, userId });
    } else {
      // Add reaction
      const newReaction = await prisma.reaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
        include: {
          user: {
            select: { id: true, username: true, displayName: true },
          },
        },
      });
      res.status(201).json({ action: 'added', reaction: newReaction });
    }
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// Toggle pin message
router.post('/message/:id/pin', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messageId = req.params.id;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// Get pinned messages for channel
router.get('/:channelId/pins', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;

    const pins = await prisma.message.findMany({
      where: { channelId, isPinned: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        attachments: true,
      },
    });

    res.json(pins);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

export default router;
