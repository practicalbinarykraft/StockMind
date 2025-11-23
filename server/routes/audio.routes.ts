import type { Express } from "express";
import { isAuthenticated } from "../replit-auth";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure audio upload directory
const uploadDir = path.join(process.cwd(), 'uploads', 'audio');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, and M4A are allowed.'));
    }
  }
});

/**
 * Audio Upload routes
 * Handles audio file uploads for voice generation
 */
export function registerAudioRoutes(app: Express) {
  /**
   * POST /api/audio/upload
   * Uploads an audio file to the server
   * Accepts: MP3, WAV, M4A (max 25MB)
   */
  app.post("/api/audio/upload", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const audioUrl = `/uploads/audio/${req.file.filename}`;
      res.json({
        success: true,
        filename: req.file.filename,
        audioUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error: any) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ message: error.message || "Failed to upload audio" });
    }
  });
}
