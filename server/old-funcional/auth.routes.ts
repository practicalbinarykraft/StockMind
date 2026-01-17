import { Router, type Express } from 'express';
import { db } from '../db';
import { users, registerSchema, loginSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateToken, hashPassword, comparePassword } from '../lib/jwt-auth';
import { requireAuth } from '../middleware/jwt-auth';
import { logger } from '../lib/logger';
import { setAuthCookie, clearAuthCookie } from '../lib/cookie-auth';

/**
 * JWT Authentication Routes
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

    // Set token in httpOnly cookie (secure, not accessible via JS)
    setAuthCookie(res, token);

    logger.info('User registered successfully', { userId: newUser.id, cookieSet: true });

    // Debug: Log response headers being sent
    logger.debug('Register response headers', {
      setCookie: res.getHeader('Set-Cookie'),
    });

    // Return user data (token is in cookie, not in response body)
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
      }
    });
  } catch (error: any) {
    // Log full error for debugging
    logger.error('Registration failed', {
      error: error,
      errorType: typeof error,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
      isAggregate: error?.name === 'AggregateError',
      nestedErrors: error?.errors?.length || 0,
      errorKeys: error ? Object.keys(error) : []
    });

    // Since database queries are the only async operations that can fail here,
    // any error is likely a database connection issue
    // Return 503 (Service Unavailable) for all errors during registration
    return res.status(503).json({
      message: 'Database connection failed',
      error: 'Unable to connect to database. Please ensure PostgreSQL is running.',
      hint: 'Start PostgreSQL with: docker run -d --name stockmind-postgres -e POSTGRES_USER=stockmind -e POSTGRES_PASSWORD=stockmind_dev -e POSTGRES_DB=stockmind -p 5432:5432 postgres:16',
      troubleshooting: [
        '1. Check if PostgreSQL is running',
        '2. Verify DATABASE_URL in .env file',
        '3. Run: npm run db:migrate to apply migrations',
        '4. Check server logs for detailed error information'
      ]
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

    // Set token in httpOnly cookie (secure, not accessible via JS)
    setAuthCookie(res, token);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      cookieSet: true,
    });

    // Debug: Log response headers being sent
    logger.debug('Login response headers', {
      setCookie: res.getHeader('Set-Cookie'),
    });

    // Return user data (token is in cookie, not in response body)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      }
    });
  } catch (error: any) {
    // Log full error for debugging
    logger.error('Login failed', {
      error: error,
      errorType: typeof error,
      errorName: error?.name,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
      isAggregate: error?.name === 'AggregateError',
      nestedErrors: error?.errors?.length || 0,
      errorKeys: error ? Object.keys(error) : []
    });

    // If error occurs during database query, it's likely a connection issue
    // The query happens at line 113-117, so any error here is DB-related
    // Check for common connection error patterns
    const errorName = error?.name;
    const errorCode = error?.code || error?.errno;
    const errorMessage = error?.message || '';
    const isAggregateError = errorName === 'AggregateError';
    
    // Check nested errors in AggregateError
    let hasConnectionError = false;
    if (isAggregateError && error?.errors) {
      hasConnectionError = error.errors.some((e: any) => 
        e?.code === 'ECONNREFUSED' || 
        e?.code === 'ENOTFOUND' ||
        e?.code === 'ETIMEDOUT' ||
        String(e).toLowerCase().includes('connect')
      );
    }

    // Since the database query is the only async operation that can fail here,
    // any error is likely a database connection issue
    // Return 503 (Service Unavailable) for all errors during login
    return res.status(503).json({
      message: 'Database connection failed',
      error: 'Unable to connect to database. Please ensure PostgreSQL is running.',
      hint: 'Start PostgreSQL with: docker run -d --name stockmind-postgres -e POSTGRES_USER=stockmind -e POSTGRES_PASSWORD=stockmind_dev -e POSTGRES_DB=stockmind -p 5432:5432 postgres:16',
      troubleshooting: [
        '1. Check if PostgreSQL is running',
        '2. Verify DATABASE_URL in .env file',
        '3. Run: npm run db:migrate to apply migrations',
        '4. Check server logs for detailed error information'
      ]
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
  // Clear JWT cookie
  clearAuthCookie(res);

  logger.info('User logged out', { userId: req.userId });

  res.json({
    message: 'Logout successful'
  });
});

/**
 * Register auth routes with Express app
 */
// export function registerAuthRoutes(app: Express) {
//   app.use('/api/auth', router);
// }
