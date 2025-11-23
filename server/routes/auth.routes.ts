import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit-auth";
import { getUserId } from "../utils/route-helpers";

/**
 * Authentication routes
 * Handles user authentication and profile retrieval
 */
export function registerAuthRoutes(app: Express) {
  // GET /api/auth/user - Get current authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
