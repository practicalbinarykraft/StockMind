import { Router } from "express";
import { authController } from "./auth.controller";
import { Express } from "express";


const router = Router();

// POST /api/auth/register - регистрация
router.post("/register", authController.register);

// POST /api/auth/login - вход
router.post("/login", authController.login);

// POST /api/auth/logout - выход
router.post("/logout", authController.logout);

export function registerAuthRoutes(app: Express) {
    app.use('/api/auth', router);
}
