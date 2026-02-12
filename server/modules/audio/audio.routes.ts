import { requireAuth } from "../../middleware/jwt-auth";
import { uploadLimiter } from "../../middleware/rate-limiter";
import { Router } from "express";
import { audioController } from "./audio.controller";
import type { Express } from "express";
import multer from "multer";

// Configure multer for audio file uploads
// Используем memoryStorage для загрузки в R2 вместо сохранения на диск
const upload = multer({
  storage: multer.memoryStorage(), // Храним файл в памяти, не на диске
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
});

const router = Router();

router.post("/audio/upload", uploadLimiter, requireAuth, upload.single("audio"), audioController.uploadAudio);

export function registerAudioRoutes(app: Express) {
  app.use("/api", router);
}
