import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { hasPermission, Permissions } from '../utils/permissions.js';

const router = Router();

// Get all servers user is member of
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: {
            userId: req.user!.userId,
          },
        },
      },
      include: {
        channels: {
          orderBy: { position: 'asc' },
        },
        categories: {
          orderBy: { position: 'asc' },
        },
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
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(servers);
  } catch (error) {
    console.error('Fetch servers error:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Create Server
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, iconUrl } = req.body;
    const userId = req.user!.userId;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Server name is required' });
      return;
    }

    const inviteCode = crypto.randomBytes(4).toString('hex');

    // Create server with default roles, categories, and channels
    const server = await prisma.server.create({
      data: {
        name: name.trim(),
        iconUrl: iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`,
        inviteCode,
        ownerId: userId,
        roles: {
          create: [
            {
              name: 'Admin',
              color: '#ED4245',
              position: 1,
              permissions: 'ADMINISTRATOR',
            },
            {
              name: 'Member',
              color: '#99AAB5',
              position: 2,
              permissions: 'SEND_MESSAGES,ADD_REACTIONS,ATTACH_FILES,CONNECT_VOICE,SPEAK_VOICE,STREAM_VIDEO',
            },
          ],
        },
        categories: {
          create: [
            { name: 'TEXT CHANNELS', position: 0 },
            { name: 'VOICE CHANNELS', position: 1 },
          ],
        },
      },
      include: {
        roles: true,
        categories: true,
      },
    });

    const textCategory = server.categories.find((c) => c.name === 'TEXT CHANNELS');
    const voiceCategory = server.categories.find((c) => c.name === 'VOICE CHANNELS');
    const adminRole = server.roles.find((r) => r.name === 'Admin');

    // Create default channels
    await prisma.channel.createMany({
      data: [
        {
          serverId: server.id,
          categoryId: textCategory?.id,
          name: 'general',
          type: 'TEXT',
          position: 0,
        },
        {
          serverId: server.id,
          categoryId: textCategory?.id,
          name: 'announcements',
          type: 'TEXT',
          position: 1,
        },
        {
          serverId: server.id,
          categoryId: voiceCategory?.id,
          name: 'General Voice',
          type: 'VOICE',
          position: 0,
        },
      ],
    });

    // Add owner as member with Admin role
    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
        roleId: adminRole?.id,
      },
    });

    // Return complete server
    const fullServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: {
        channels: true,
        categories: true,
        roles: true,
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
            role: true,
          },
        },
      },
    });

    res.status(201).json(fullServer);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Join server by invite code
router.post('/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user!.userId;

    if (!inviteCode) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const cleanCode = inviteCode.trim().split('/').pop(); // handle full link or code

    const server = await prisma.server.findUnique({
      where: { inviteCode: cleanCode },
      include: {
        roles: true,
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found with this invite code' });
      return;
    }

    const existingMember = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: server.id,
          userId,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this server', serverId: server.id });
      return;
    }

    const defaultRole = server.roles.find((r) => r.name === 'Member') || server.roles[0];

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
        roleId: defaultRole?.id,
      },
    });

    const fullServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: {
        channels: { orderBy: { position: 'asc' } },
        categories: { orderBy: { position: 'asc' } },
        roles: true,
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
            role: true,
          },
        },
      },
    });

    res.json(fullServer);
  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Get single server details
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: {
        channels: { orderBy: { position: 'asc' } },
        categories: { orderBy: { position: 'asc' } },
        roles: true,
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
            role: true,
          },
        },
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

// Update Server
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, iconUrl } = req.body;
    const serverId = req.params.id;
    const userId = req.user!.userId;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        members: {
          where: { userId },
          include: { role: true },
        },
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    const member = server.members[0];
    const isOwner = server.ownerId === userId;
    const canManage = hasPermission(member?.role?.permissions, Permissions.MANAGE_SERVER, isOwner);

    if (!canManage) {
      res.status(403).json({ error: 'Permission denied: Manage Server required' });
      return;
    }

    const updated = await prisma.server.update({
      where: { id: serverId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(iconUrl !== undefined && { iconUrl }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Delete Server
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serverId = req.params.id;
    const userId = req.user!.userId;

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    if (server.ownerId !== userId) {
      res.status(403).json({ error: 'Only the server owner can delete the server' });
      return;
    }

    await prisma.server.delete({ where: { id: serverId } });
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Leave Server
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serverId = req.params.id;
    const userId = req.user!.userId;

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) {
      res.status(404).json({ error: 'Server not found' });
      return;
    }

    if (server.ownerId === userId) {
      res.status(400).json({ error: 'Owner cannot leave their own server. Delete it or transfer ownership.' });
      return;
    }

    await prisma.serverMember.deleteMany({
      where: { serverId, userId },
    });

    res.json({ message: 'Left server successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave server' });
  }
});

// Kick member
router.delete('/:id/members/:memberId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: serverId, memberId } = req.params;
    const userId = req.user!.userId;

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

    const currentMember = server.members[0];
    const isOwner = server.ownerId === userId;
    const canKick = hasPermission(currentMember?.role?.permissions, Permissions.KICK_MEMBERS, isOwner);

    if (!canKick) {
      res.status(403).json({ error: 'Permission denied: Kick Members required' });
      return;
    }

    const targetMember = await prisma.serverMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.serverId !== serverId) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (targetMember.userId === server.ownerId) {
      res.status(400).json({ error: 'Cannot kick the server owner' });
      return;
    }

    await prisma.serverMember.delete({
      where: { id: memberId },
    });

    res.json({ message: 'Member kicked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// Update member role / nickname
router.patch('/:id/members/:memberId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: serverId, memberId } = req.params;
    const { roleId, nickname } = req.body;
    const userId = req.user!.userId;

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

    const currentMember = server.members[0];
    const isOwner = server.ownerId === userId;
    const canManageRoles = hasPermission(currentMember?.role?.permissions, Permissions.MANAGE_ROLES, isOwner);

    if (!canManageRoles) {
      res.status(403).json({ error: 'Permission denied: Manage Roles required' });
      return;
    }

    const updated = await prisma.serverMember.update({
      where: { id: memberId },
      data: {
        ...(roleId !== undefined && { roleId }),
        ...(nickname !== undefined && { nickname }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
        role: true,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

export default router;
