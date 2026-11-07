import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Upload single file
router.post('/file', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      contentType: req.file.mimetype,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload multiple files
router.post('/multiple', authMiddleware, upload.array('files', 10), (req: AuthRequest, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const uploaded = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      filename: f.originalname,
      size: f.size,
      contentType: f.mimetype,
    }));

    res.json(uploaded);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

export default router;
