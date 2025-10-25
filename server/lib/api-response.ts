/**
 * API Response Helpers - Standardized response formats
 * 
 * Purpose: Provide consistent, typed response formats for API endpoints
 * while maintaining backward compatibility during migration.
 * 
 * Usage:
 *   - Use apiResponse.ok() for successful operations with data
 *   - Use apiResponse.created() for resource creation
 *   - Use apiResponse.noContent() for successful operations without data
 *   - Use apiResponse.error() for error responses
 * 
 * Migration Strategy:
 *   - Phase 1: Migrate complex/mixed-format endpoints (10-15 endpoints)
 *   - Phase 2: Gradual migration of simple data-only endpoints
 *   - Phase 3: Deprecate old patterns
 */

import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export interface ApiNoContentResponse {
  success: true;
}

/**
 * Standard API response helpers
 */
export const apiResponse = {
  /**
   * Success response with data (200 OK)
   * @param res Express response object
   * @param data Response data
   */
  ok<T>(res: Response, data: T): Response<ApiSuccessResponse<T>> {
    return res.status(200).json({
      success: true,
      data,
    });
  },

  /**
   * Resource created successfully (201 Created)
   * @param res Express response object
   * @param data Created resource data
   */
  created<T>(res: Response, data: T): Response<ApiSuccessResponse<T>> {
    return res.status(201).json({
      success: true,
      data,
    });
  },

  /**
   * Successful operation without response body (200 OK)
   * Used for deletions, updates without returned data
   * @param res Express response object
   */
  noContent(res: Response): Response<ApiNoContentResponse> {
    return res.status(200).json({
      success: true,
    });
  },

  /**
   * Bad request error (400)
   * @param res Express response object
   * @param error Error message
   * @param details Optional error details
   */
  badRequest(res: Response, error: string, details?: any): Response<ApiErrorResponse> {
    return res.status(400).json({
      success: false,
      error,
      ...(details && { details }),
    });
  },

  /**
   * Unauthorized error (401)
   * @param res Express response object
   * @param error Error message
   */
  unauthorized(res: Response, error: string = 'Unauthorized'): Response<ApiErrorResponse> {
    return res.status(401).json({
      success: false,
      error,
    });
  },

  /**
   * Not found error (404)
   * @param res Express response object
   * @param error Error message
   */
  notFound(res: Response, error: string): Response<ApiErrorResponse> {
    return res.status(404).json({
      success: false,
      error,
    });
  },

  /**
   * Internal server error (500)
   * @param res Express response object
   * @param error Error message
   * @param details Optional error details (only in development)
   */
  serverError(res: Response, error: string, details?: any): Response<ApiErrorResponse> {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      success: false,
      error,
      ...(isDevelopment && details && { details }),
    });
  },

  /**
   * Complex response with multiple fields (for gradual migration)
   * This is a passthrough for endpoints that return multiple top-level fields.
   * Use this temporarily during migration, then refactor to use .ok() with nested data.
   * 
   * @param res Express response object
   * @param fields Response fields
   */
  complex<T extends Record<string, any>>(res: Response, fields: T): Response<T> {
    return res.status(200).json(fields);
  },
};

/**
 * Legacy patterns (to be migrated)
 * 
 * These patterns exist in the codebase and will be gradually replaced:
 * 
 * 1. Direct data return:
 *    res.json(user) 
 *    → Migrate to: apiResponse.ok(res, user)
 * 
 * 2. Success wrapper:
 *    res.json({ success: true })
 *    → Migrate to: apiResponse.noContent(res)
 * 
 * 3. Mixed fields:
 *    res.json({ currentVersion, versions, recommendations })
 *    → Option A: apiResponse.ok(res, { currentVersion, versions, recommendations })
 *    → Option B: apiResponse.complex(res, { currentVersion, versions, recommendations })
 */
