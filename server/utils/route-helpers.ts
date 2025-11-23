/**
 * Unified userId extraction from request
 * Works with JWT authentication (userId attached directly to request)
 */
export function getUserId(req: any): string | null {
  return req.userId || null;
}

/**
 * Normalize Instagram username
 * Converts @username, URLs (instagram.com/username, ig.me/username) to plain username
 * @param input - Raw username input from user
 * @returns Normalized username (lowercase, alphanumeric + underscore + dot)
 */
export function normalizeInstagramUsername(input: string): string {
  let username = input.trim();

  // Remove @ prefix
  if (username.startsWith('@')) {
    username = username.slice(1);
  }

  // Extract username from URLs
  // Patterns: instagram.com/username, www.instagram.com/username, ig.me/username, instagr.am/username
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/,
    /(?:https?:\/\/)?(?:www\.)?ig\.me\/([a-zA-Z0-9_.]+)/,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/([a-zA-Z0-9_.]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = username.match(pattern);
    if (match && match[1]) {
      username = match[1];
      break;
    }
  }

  // Remove trailing slashes
  username = username.replace(/\/+$/, '');

  // Validate username (only alphanumeric, underscore, dot allowed)
  // Instagram usernames: 1-30 chars, letters/numbers/underscore/dot
  if (!/^[a-zA-Z0-9_.]{1,30}$/.test(username)) {
    throw new Error(`Invalid Instagram username: "${username}". Must contain only letters, numbers, underscore, and dot (1-30 characters)`);
  }

  return username.toLowerCase();
}
