import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken } from '../utils/jwt.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email and password are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
    });

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        res.status(400).json({ error: 'Username is already taken' });
        return;
      }
      res.status(400).json({ error: 'Email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: displayName?.trim() || username,
        email: cleanEmail,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        settings: {
          create: {
            theme: 'dark',
            accentColor: '#5865F2',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: user.status,
        customStatus: user.customStatus,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

// Login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body; // login can be username or email

    if (!login || !password) {
      res.status(400).json({ error: 'Email/Username and password are required' });
      return;
    }

    const cleanLogin = login.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanLogin }, { email: cleanLogin }],
      },
      include: {
        settings: true,
      },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    // Set online
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        status: 'online',
        customStatus: user.customStatus,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { settings: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      status: user.status,
      customStatus: user.customStatus,
      settings: user.settings,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update Profile
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, avatarUrl, bannerUrl, bio, customStatus, settings } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(displayName !== undefined && { displayName: displayName.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(bio !== undefined && { bio }),
        ...(customStatus !== undefined && { customStatus }),
        ...(settings && {
          settings: {
            upsert: {
              create: settings,
              update: settings,
            },
          },
        }),
      },
      include: { settings: true },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Status (online, idle, dnd, offline)
router.patch('/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['online', 'idle', 'dnd', 'offline'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { status },
      select: { id: true, status: true },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Password recovery / reset
router.post('/forgot-password', async (req, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ error: 'Email and new password required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: 'User with this email not found' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
