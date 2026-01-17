import { requireAuth } from "../../middleware/jwt-auth";
import { uploadLimiter } from "../../middleware/rate-limiter";
import { Router } from "express";
import { audioController } from "./audio.controller";
import { audioService } from "./audio.service";
import type { Express } from "express";
import multer from "multer";
import path from "path";

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, audioService.getUploadDir());
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-m4a", "audio/mp4"];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3, WAV, and M4A are allowed."));
    }
  },
}); // utils

const router = Router();

router.post("/audio/upload", uploadLimiter, requireAuth, upload.single("audio"), audioController.uploadAudio);

export function registerAudioRoutes(app: Express) {
  app.use("/api", router);
}
