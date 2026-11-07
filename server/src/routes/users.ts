import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Search users
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string)?.trim().toLowerCase();
    const currentUserId = req.user!.userId;

    if (!query) {
      res.json([]);
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: query } },
              { displayName: { contains: query } },
            ],
          },
        ],
      },
      take: 20,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        customStatus: true,
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user profile
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        status: true,
        customStatus: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get friends list
router.get('/friends/list', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
            customStatus: true,
          },
        },
        receiver: {
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
    });

    // Format friendship with partner user object and relationship direction
    const formatted = friendships.map((f) => {
      const isSender = f.senderId === userId;
      const partner = isSender ? f.receiver : f.sender;
      return {
        id: f.id,
        status: f.status,
        isOutgoing: isSender,
        user: partner,
        createdAt: f.createdAt,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Send friend request
router.post('/friends/request', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.body;
    const userId = req.user!.userId;

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    const targetUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found with that username' });
      return;
    }

    if (targetUser.id === userId) {
      res.status(400).json({ error: 'You cannot add yourself as a friend' });
      return;
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(400).json({ error: 'You are already friends' });
        return;
      }
      if (existing.senderId === userId) {
        res.status(400).json({ error: 'Friend request already sent' });
        return;
      }
      // If target already sent a request to us, auto-accept it!
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      });
      res.json({ message: 'Friend request accepted', friendship: accepted });
      return;
    }

    const friendship = await prisma.friendship.create({
      data: {
        senderId: userId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
    });

    res.status(201).json({ message: 'Friend request sent', friendship });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/friends/:id/accept', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendshipId = req.params.id;
    const userId = req.user!.userId;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || friendship.receiverId !== userId) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Remove / decline friendship
router.delete('/friends/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendshipId = req.params.id;
    const userId = req.user!.userId;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || (friendship.senderId !== userId && friendship.receiverId !== userId)) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
