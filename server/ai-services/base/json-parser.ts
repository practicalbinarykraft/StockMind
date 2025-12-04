// Universal JSON extractor with proper brace balancing - handles nested objects/arrays
export function extractJson<T = any>(blocks: { type: string; text?: string }[]): T {
  const text = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n');

  // First try to find fenced json block
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;

  // Find all possible JSON start positions (both { and [)
  const jsonCandidates: string[] = [];

  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];
    if (char === '{' || char === '[') {
      // Balance braces/brackets to find complete JSON
      let depth = 0;
      let inString = false;
      let escape = false;
      const closeChar = char === '{' ? '}' : ']';

      for (let j = i; j < candidate.length; j++) {
        const c = candidate[j];

        if (escape) {
          escape = false;
          continue;
        }

        if (c === '\\') {
          escape = true;
          continue;
        }

        if (c === '"') {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (c === char) depth++;
        if (c === closeChar) depth--;

        if (depth === 0) {
          jsonCandidates.push(candidate.substring(i, j + 1));
          break;
        }
      }
    }
  }

  // Try parsing candidates from longest to shortest
  let lastError: unknown = null;
  for (const json of jsonCandidates.sort((a, b) => b.length - a.length)) {
    try {
      return JSON.parse(json);
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(`Could not parse AI JSON. Last error: ${(lastError as Error)?.message || 'unknown'}. Text: ${candidate.substring(0, 200)}`);
}
