import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

// Generate LiveKit token if configured
router.post('/token', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomName } = req.body;
    const user = req.user!;

    if (!config.livekit.apiKey || !config.livekit.apiSecret) {
      // Returns indicator that livekit cloud keys are not configured,
      // which signals client to use built-in WebRTC mesh signaling
      res.json({
        enabled: false,
        message: 'LiveKit keys not configured. Built-in WebRTC mesh signaling is active.',
      });
      return;
    }

    res.json({
      enabled: true,
      roomName: roomName || 'general',
      identity: user.userId,
      name: user.username,
      livekitUrl: config.livekit.url,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
