export function extractScoreDelta(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/([+\-]?\d+(\.\d+)?)\s*(points|pt|%)/i);
  return m ? Math.round(Number(m[1])) : null;
}

export function priorityToConfidence(priority: string): number {
  switch (priority) {
    case "critical": return 0.95;
    case "high": return 0.85;
    case "medium": return 0.7;
    case "low": return 0.5;
    default: return 0.6;
  }
}
