# API Response Format - Migration Guide

## Overview

ReelRepurposer API is transitioning to a standardized response format using typed response helpers. This document describes the new format and migration status.

## Standard Response Format

All API endpoints now use a consistent wrapper structure:

### Success Response (200 OK)
```typescript
{
  success: true,
  data: {
    // Response payload
  }
}
```

### Error Response (4xx/5xx)
```typescript
{
  success: false,
  error: "Error message",
  details?: any  // Only in development mode
}
```

## Migrated Endpoints (Phase 1)

The following complex endpoints have been migrated to the new format:

### 1. Apply All Recommendations
**Endpoint:** `POST /api/projects/:id/apply-all-recommendations`

**Old Format:**
```json
{
  "success": true,
  "newVersion": {...},
  "appliedCount": 5,
  "affectedScenes": [1, 2, 3]
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "newVersion": {...},
    "appliedCount": 5,
    "affectedScenes": [1, 2, 3]
  }
}
```

### 2. Edit Scene
**Endpoint:** `POST /api/projects/:id/edit-scene`

**Old Format:**
```json
{
  "success": true,
  "newVersion": {...},
  "needsReanalysis": true
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "newVersion": {...},
    "needsReanalysis": true
  }
}
```

### 3. Revert to Version
**Endpoint:** `POST /api/projects/:id/revert-to-version`

**Old Format:**
```json
{
  "success": true,
  "newVersion": {...},
  "message": "Reverted to version 3"
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "newVersion": {...},
    "message": "Reverted to version 3"
  }
}
```

### 4. Create Initial Version
**Endpoint:** `POST /api/projects/:id/create-initial-version`

**Old Format:**
```json
{
  "success": true,
  "version": {...},
  "recommendationsCount": 10
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "version": {...},
    "recommendationsCount": 10
  }
}
```

### 5. Script History
**Endpoint:** `GET /api/projects/:id/script-history`

**Old Format:**
```json
{
  "currentVersion": {...},
  "versions": [...],
  "recommendations": [...],
  "hasUnappliedRecommendations": true
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "currentVersion": {...},
    "versions": [...],
    "recommendations": [...],
    "hasUnappliedRecommendations": true
  }
}
```

### 6. Analyze Source
**Endpoint:** `POST /api/projects/:id/analyze-source`

**Old Format:**
```json
{
  "analysis": {...},
  "recommendedFormat": "short",
  "sourceMetadata": {...},
  "metadata": {...}
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "analysis": {...},
    "recommendedFormat": "short",
    "sourceMetadata": {...},
    "metadata": {...}
  }
}
```

### 7. Compare Analysis Systems
**Endpoint:** `POST /api/analyze/compare`

**Old Format:**
```json
{
  "comparison": {
    "old": {...},
    "new": {...},
    "scoreDifference": 15,
    "detailImprovement": {...}
  }
}
```

**New Format:**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "old": {...},
      "new": {...},
      "scoreDifference": 15,
      "detailImprovement": {...}
    }
  }
}
```

## Frontend Migration Guide

### React Query Integration

Update your query/mutation handlers to unwrap the `data` field:

**Before:**
```typescript
const { data: result } = useQuery({
  queryKey: ['/api/projects', id, 'script-history'],
});

// Access: result.currentVersion
```

**After:**
```typescript
const { data: response } = useQuery({
  queryKey: ['/api/projects', id, 'script-history'],
});

// Access: response.data.currentVersion
// Or destructure:
const result = response?.data;
```

### Error Handling

**Before:**
```typescript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}
```

**After:**
```typescript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error); // Changed from error.message
}
```

### TypeScript Types

Use the exported types from `server/lib/api-response.ts`:

```typescript
import type { ApiSuccessResponse, ApiErrorResponse } from '@/server/lib/api-response';

// For success responses
type ScriptHistoryResponse = ApiSuccessResponse<{
  currentVersion: ScriptVersion | null;
  versions: ScriptVersion[];
  recommendations: SceneRecommendation[];
  hasUnappliedRecommendations: boolean;
}>;

// For error responses  
type ErrorResponse = ApiErrorResponse;
```

## Unmigrated Endpoints

The following endpoints still use legacy formats (will be migrated in Phase 2):

- Simple CRUD endpoints (GET /api/users/me, GET /api/api-keys, etc.)
- Direct data returns (res.json(user))
- Success-only responses (res.json({ success: true }))

## Best Practices

1. **Always check `success` field** before accessing `data`
2. **Use TypeScript types** for type safety
3. **Handle errors uniformly** using the `error` field
4. **Test both success and error paths** when integrating new endpoints

## Backend Developer Guide

When creating new endpoints, use the `apiResponse` helpers:

```typescript
import { apiResponse } from './lib/api-response';

// Success with data
return apiResponse.ok(res, { users, count });

// Created resource
return apiResponse.created(res, newUser);

// No content (delete/update)
return apiResponse.noContent(res);

// Errors
return apiResponse.badRequest(res, 'Invalid input');
return apiResponse.notFound(res, 'User not found');
return apiResponse.serverError(res, error.message, error);
```

## Migration Timeline

- **Phase 1 (Completed):** Complex/mixed-format endpoints (7 endpoints)
- **Phase 2 (Planned):** Simple data-only endpoints (~40 endpoints)
- **Phase 3 (Future):** Deprecate old patterns, enforce new format

## Questions?

Contact the backend team or refer to `server/lib/api-response.ts` for implementation details.
