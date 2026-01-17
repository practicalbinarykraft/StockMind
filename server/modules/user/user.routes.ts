import { Router } from "express";
import { userController } from "./user.controller";
import { requireAuth } from "../../middleware/jwt-auth";
import type { Express } from "express";


const router = Router();

router.get('/:id', requireAuth, userController.getUser);

export function registerUserRoutes(app: Express) {
    app.use('/api/user', router);
}
