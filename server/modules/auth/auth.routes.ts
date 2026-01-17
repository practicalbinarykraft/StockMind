import { Router } from "express";
import { authController } from "./auth.controller";
import { requireAuth } from "../../middleware/jwt-auth";
import type { Express } from "express";


const router = Router();

// POST /api/auth/register - регистрация
router.post("/register", authController.register);

// POST /api/auth/login - вход
router.post("/login", authController.login);

// POST /api/auth/logout - выход
router.post("/logout", authController.logout);

// GET /api/auth/me - получить данные текущего пользователя
router.get("/me", requireAuth, authController.getMe);

export function registerAuthRoutes(app: Express) {
    app.use('/api/auth', router);
}
