import { Request, Response } from "express"
import { registerSchema, loginSchema } from "@shared/schema"
import { authService } from "./auth.service";
import { clearAuthCookie, setAuthCookie } from "../../lib/cookie-auth";
import { logger } from "../../lib/logger";

export const authController = {
    async register(req: Request, res: Response) {
        try {
        const validation = registerSchema.safeParse(req.body); // dto

        if (!validation.success) {
          return res.status(400).json({
            message: 'Validation failed',
            errors: validation.error.flatten().fieldErrors
          });
        }
    
        const { newUser, token } = await authService.register(validation.data);

        setAuthCookie(res, token);

        res.status(201).json({
          message: 'Registration successful',
          user: newUser,
        });
    } catch (error) {
        logger.error('Registration failed', { error });
        res.status(500).json({
            message: 'Registration failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return res.status(503).json({
            message: 'Database connection failed',
            error: 'Unable to connect to database. Please ensure PostgreSQL is running.',
            hint: 'Start PostgreSQL with: docker run -d --name stockmind-postgres -e POSTGRES_USER=stockmind -e' +
            'POSTGRES_PASSWORD=stockmind_dev -e POSTGRES_DB=stockmind -p 5432:5432 postgres:16',
            troubleshooting: [
              '1. Check if PostgreSQL is running',
              '2. Verify DATABASE_URL in .env file',
              '3. Run: npm run db:migrate to apply migrations',
              '4. Check server logs for detailed error information'
            ]
        }); // error middleware
    }
    },


    async login(req: Request, res: Response) {
        try {
            const validation = loginSchema.safeParse(req.body); // dto
            if (!validation.success) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: validation.error.flatten().fieldErrors
                });
            }

            const { user, token } = await authService.login(validation.data);

            setAuthCookie(res, token);

            res.json({
                message: 'Login successful',
                user
              });
        } catch (error) {
            logger.error('Login failed', { error });
            res.status(500).json({
                message: 'Login failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return res.status(503).json({
                message: 'Database connection failed',
                error: 'Unable to connect to database. Please ensure PostgreSQL is running.',
                hint: 'Start PostgreSQL with: docker run -d --name stockmind-postgres -e POSTGRES_USER=stockmind -e' +
                'POSTGRES_PASSWORD=stockmind_dev -e POSTGRES_DB=stockmind -p 5432:5432 postgres:16',
                troubleshooting: [
                  '1. Check if PostgreSQL is running',
                  '2. Verify DATABASE_URL in .env file',
                  '3. Run: npm run db:migrate to apply migrations',
                  '4. Check server logs for detailed error information'
                ]
            }); // error middleware
        }
    },

    
    async logout(req: Request, res: Response) {
        clearAuthCookie(res);
        logger.info('User logged out', { userId: req.userId });
        res.json({
            message: 'Logout successful'
        });
    }
}