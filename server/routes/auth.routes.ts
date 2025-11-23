import { Router, type Express } from 'express';
import { db } from '../db';
import { users, registerSchema, loginSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateToken, hashPassword, comparePassword } from '../lib/jwt-auth';
import { requireAuth } from '../middleware/jwt-auth';
import { logger } from '../lib/logger';

/**
 * JWT Authentication Routes
 * Replaces Replit Auth with standard JWT authentication
 */

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { email, password, firstName, lastName } = validation.data;

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
      })
      .returning();

    // Generate JWT token
    const token = generateToken(newUser);

    logger.info('User registered successfully', {
      userId: newUser.id,
      email: newUser.email
    });

    // Return user data (without password hash) and token
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
      }
    });
  } catch (error: any) {
    logger.error('Registration failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { email, password } = validation.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      logger.warn('Failed login attempt', { email });
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email
    });

    // Return user data (without password hash) and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      }
    });
  } catch (error: any) {
    logger.error('Login failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({ user });
  } catch (error: any) {
    logger.error('Failed to get user info', {
      error: error.message,
      userId: req.userId
    });

    res.status(500).json({
      message: 'Failed to get user information',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/user (legacy endpoint for backwards compatibility)
 * Alias for /api/auth/me
 */
router.get('/user', requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error: any) {
    logger.error('Failed to get user info', {
      error: error.message,
      userId: req.userId
    });

    res.status(500).json({
      message: 'Failed to get user information',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should delete token)
 */
router.post('/logout', (req, res) => {
  // With JWT, logout is handled client-side by deleting the token
  // This endpoint exists for consistency with other auth systems
  logger.info('User logged out', { userId: req.userId });

  res.json({
    message: 'Logout successful'
  });
});

/**
 * Register auth routes with Express app
 */
export function registerAuthRoutes(app: Express) {
  app.use('/api/auth', router);
  logger.info('JWT authentication routes registered');
}
