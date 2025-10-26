import { jsonrepair } from 'jsonrepair';

/**
 * Safely parse JSON from LLM responses with automatic repair
 * 
 * Claude sometimes returns malformed JSON (extra commas, missing brackets, etc.)
 * This function:
 * 1. Tries direct JSON.parse
 * 2. If that fails, uses jsonrepair to fix common issues
 * 3. Tries parsing again
 * 4. If still fails, throws with helpful error message
 * 
 * @param jsonStr - Raw JSON string from LLM
 * @param context - Context for error messages (e.g., "Claude analysis response")
 * @returns Parsed JSON object
 * @throws Error if JSON cannot be parsed even after repair
 */
export function safeParseLLM<T = any>(jsonStr: string, context = 'LLM response'): T {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error(`${context}: Invalid input - expected string, got ${typeof jsonStr}`);
  }

  // First attempt: try parsing directly
  try {
    return JSON.parse(jsonStr);
  } catch (firstError: any) {
    console.warn(`[safeParseLLM] First parse failed for ${context}:`, firstError.message);
    
    // Second attempt: repair and retry
    try {
      const repaired = jsonrepair(jsonStr);
      console.log(`[safeParseLLM] JSON repaired successfully for ${context}`);
      return JSON.parse(repaired);
    } catch (secondError: any) {
      // Both attempts failed - provide detailed error
      const preview = jsonStr.substring(0, 200);
      console.error(`[safeParseLLM] Both parse and repair failed for ${context}:`, {
        firstError: firstError.message,
        secondError: secondError.message,
        preview,
      });
      
      throw new Error(
        `${context}: Failed to parse JSON even after repair. ` +
        `Original error: ${firstError.message}. ` +
        `Repair error: ${secondError.message}. ` +
        `Preview: ${preview}...`
      );
    }
  }
}

/**
 * Extract and parse JSON from text that might contain markdown code blocks
 * LLMs sometimes wrap JSON in ```json...``` blocks
 * 
 * @param text - Raw text that might contain JSON
 * @param context - Context for error messages
 * @returns Parsed JSON object
 */
export function extractAndParseLLM<T = any>(text: string, context = 'LLM response'): T {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  
  return safeParseLLM<T>(jsonStr.trim(), context);
}
