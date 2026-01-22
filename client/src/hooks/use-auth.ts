/**
 * Auth hook re-export
 *
 * Re-exports useAuth from app providers for backward compatibility
 * All auth state is managed via httpOnly cookies
 * @deprecated Use @/app/providers/AuthProvider instead
 */
export { useAuth } from "@/app/providers/AuthProvider"; // проверить после всех изменений
