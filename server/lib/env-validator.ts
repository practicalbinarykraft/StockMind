/**
 * Environment Variable Validation
 * Validates required environment variables on application startup
 *
 * CRITICAL: Fails fast if required variables are missing or invalid
 */

import { logger } from './logger';

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = {
  // Database
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL connection string',
    validate: (value: string) => {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        return 'Must be a valid PostgreSQL connection string (postgresql://...)';
      }
      return null;
    }
  },

  // Security
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret',
    validate: (value: string) => {
      if (value.length < 32) {
        return 'Must be at least 32 characters for security';
      }
      if (value === 'your-secret-key' || value === 'change-me') {
        return 'Cannot use default/placeholder value in production';
      }
      return null;
    }
  },

  // Application
  NODE_ENV: {
    required: false,
    description: 'Environment mode',
    default: 'development',
    validate: (value: string) => {
      if (!['development', 'production', 'test'].includes(value)) {
        return 'Must be one of: development, production, test';
      }
      return null;
    }
  },

  PORT: {
    required: false,
    description: 'HTTP server port',
    default: '5000',
    validate: (value: string) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'Must be a valid port number (1-65535)';
      }
      return null;
    }
  },
} as const;

/**
 * Recommended but optional environment variables
 */
const RECOMMENDED_ENV_VARS = {
  // Security (optional but recommended for production)
  ALLOWED_ORIGINS: {
    description: 'CORS allowed origins (comma-separated)',
    recommendedIn: ['production'],
  },

  // Monitoring (optional)
  SENTRY_DSN: {
    description: 'Sentry error tracking DSN',
    recommendedIn: ['production'],
  },

  // API Keys (optional - users can add via UI)
  ANTHROPIC_API_KEY: {
    description: 'Anthropic API key (or use BYOK)',
    recommendedIn: [],
  },
  OPENAI_API_KEY: {
    description: 'OpenAI API key (or use BYOK)',
    recommendedIn: [],
  },
  ELEVENLABS_API_KEY: {
    description: 'ElevenLabs API key (or use BYOK)',
    recommendedIn: [],
  },
  HEYGEN_API_KEY: {
    description: 'HeyGen API key (or use BYOK)',
    recommendedIn: [],
  },
} as const;

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env;
  const nodeEnv = env.NODE_ENV || 'development';

  // Validate required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = env[key];

    // Check if variable is set
    if (!value || value.trim() === '') {
      if (config.required) {
        errors.push(`❌ ${key} is required but not set. ${config.description}`);
        if ('default' in config && typeof config.default === 'string') {
          warnings.push(`   Using default value: ${config.default}`);
          // Set default value
          process.env[key] = config.default;
        }
      }
      continue;
    }

    // Validate value format
    if ('validate' in config && config.validate) {
      const validationError = config.validate(value);
      if (validationError) {
        errors.push(`❌ ${key}: ${validationError}`);
      }
    }
  }

  // Check recommended variables for production
  if (nodeEnv === 'production') {
    for (const [key, config] of Object.entries(RECOMMENDED_ENV_VARS)) {
      if ((config.recommendedIn as readonly string[]).includes('production')) {
        const value = env[key];
        if (!value || value.trim() === '') {
          warnings.push(`⚠️  ${key} not set. ${config.description}`);
        }
      }
    }

    // Production-specific checks
    if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS.trim() === '') {
      // Make it a warning instead of error for local testing
      // In real production, this should be set
      warnings.push('⚠️  ALLOWED_ORIGINS not set. CORS will allow all origins (not recommended for production)');
      warnings.push('   Example: ALLOWED_ORIGINS=https://example.com,https://app.example.com');
    }
  }

  // Security checks
  if (nodeEnv === 'production') {
    // Check for development/test values
    if (env.JWT_SECRET?.includes('test') || env.JWT_SECRET?.includes('dev')) {
      errors.push('❌ JWT_SECRET appears to be a test/dev value in production');
    }

    if (env.DATABASE_URL?.includes('localhost')) {
      warnings.push('⚠️  DATABASE_URL points to localhost in production mode');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and exit if critical errors found
 * Call this early in application startup
 */
export function validateEnvironmentOrExit(): void {
  logger.info('Validating environment variables...');

  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    logger.warn('Environment validation warnings:', {
      count: result.warnings.length,
      warnings: result.warnings,
    });

    // Print to console for visibility during startup
    console.warn('\n⚠️  Environment Warnings:');
    result.warnings.forEach(warning => console.warn(warning));
  }

  // Log and handle errors
  if (!result.isValid) {
    logger.error('Environment validation failed:', {
      errorCount: result.errors.length,
      errors: result.errors,
    });

    // Print to console for visibility
    console.error('\n❌ Environment Validation Failed:');
    console.error('━'.repeat(60));
    result.errors.forEach(error => console.error(error));
    console.error('━'.repeat(60));
    console.error('\nFix the above errors and restart the application.\n');

    // Exit with error code
    process.exit(1);
  }

  logger.info('✅ Environment validation passed', {
    nodeEnv: process.env.NODE_ENV,
    hasDatabase: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
  });

  // Log success to console
  console.log('✅ Environment validation passed');
}

/**
 * Get a validated environment variable
 * Throws if variable is missing or invalid
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
