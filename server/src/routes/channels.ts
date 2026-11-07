import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { hasPermission, Permissions } from '../utils/permissions.js';

const router = Router();

// Create channel on a server
router.post('/server/:serverId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const { name, type, categoryId, topic } = req.body;
    const userId = req.user!.userId;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        members: { where: { userId }, include: { role: true } },
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    const member = server.members[0];
    const isOwner = server.ownerId === userId;
    const canManageChannels = hasPermission(member?.role?.permissions, Permissions.MANAGE_CHANNELS, isOwner);

    if (!canManageChannels) {
      res.status(403).json({ error: 'Permission denied: Manage Channels required' });
      return;
    }

    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    const channel = await prisma.channel.create({
      data: {
        serverId,
        name: type === 'VOICE' ? name.trim() : cleanName,
        type: type === 'VOICE' ? 'VOICE' : 'TEXT',
        categoryId: categoryId || null,
        topic: topic?.trim() || null,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Update Channel
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.id;
    const { name, topic, categoryId, position } = req.body;
    const userId = req.user!.userId;

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
    const isOwner = channel.server.ownerId === userId;
    const canManageChannels = hasPermission(member?.role?.permissions, Permissions.MANAGE_CHANNELS, isOwner);

    if (!canManageChannels) {
      res.status(403).json({ error: 'Permission denied: Manage Channels required' });
      return;
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name && { name: channel.type === 'VOICE' ? name.trim() : name.trim().toLowerCase().replace(/\s+/g, '-') }),
        ...(topic !== undefined && { topic }),
        ...(categoryId !== undefined && { categoryId }),
        ...(position !== undefined && { position }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Delete Channel
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.id;
    const userId = req.user!.userId;

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
    const isOwner = channel.server.ownerId === userId;
    const canManageChannels = hasPermission(member?.role?.permissions, Permissions.MANAGE_CHANNELS, isOwner);

    if (!canManageChannels) {
      res.status(403).json({ error: 'Permission denied: Manage Channels required' });
      return;
    }

    await prisma.channel.delete({ where: { id: channelId } });
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// Create Category
router.post('/categories/:serverId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serverId } = req.params;
    const { name } = req.body;
    const userId = req.user!.userId;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        members: { where: { userId }, include: { role: true } },
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    const member = server.members[0];
    const isOwner = server.ownerId === userId;
    const canManageChannels = hasPermission(member?.role?.permissions, Permissions.MANAGE_CHANNELS, isOwner);

    if (!canManageChannels) {
      res.status(403).json({ error: 'Permission denied: Manage Channels required' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        serverId,
        name: name.trim().toUpperCase(),
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;
