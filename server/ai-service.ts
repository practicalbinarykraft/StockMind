import Anthropic from "@anthropic-ai/sdk";

export interface NewsScoreResult {
  score: number;
  comment: string;
}

export interface ReelScoreResult {
  score: number;
  comment: string;
  freshnessScore?: number;
  viralityScore?: number;
  qualityScore?: number;
}

export interface SceneAnalysis {
  sceneNumber: number;
  text: string;
  score: number;
  variants: string[];
}

export interface SceneRecommendation {
  sceneNumber: number;
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'general';
  priority: 'high' | 'medium' | 'low';
  current: string;
  suggested: string;
  reasoning: string;
  expectedImpact: string;
}

export interface ScriptAnalysis {
  format: string;
  scenes: SceneAnalysis[];
  recommendations?: SceneRecommendation[];
  overallScore: number;
  overallComment: string;
}

export async function scoreNewsItem(
  apiKey: string,
  title: string,
  content: string,
): Promise<NewsScoreResult> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are analyzing a news article for its potential virality in short-form video content (like TikTok, Instagram Reels, YouTube Shorts).

Article Title: "${title}"
Content: "${content}"

Rate this article's virality potential from 0-100, where:
- 90-100: Extremely viral - shocking, emotional, trending topics
- 70-89: High potential - interesting, shareable, relevant
- 50-69: Moderate potential - decent content, niche appeal
- 0-49: Low potential - boring, technical, limited appeal

Respond in JSON format:
{
  "score": <number 0-100>,
  "comment": "<brief 1-sentence explanation in Russian>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    score: Math.min(100, Math.max(0, result.score)),
    comment: result.comment || "Оценка контента",
  };
}

/**
 * Score Instagram Reel for viral potential based on transcription and caption
 * Analyzes content quality, engagement potential, and virality
 */
export async function scoreInstagramReel(
  apiKey: string,
  transcription: string,
  caption: string | null,
  engagementMetrics?: {
    likes: number;
    comments: number;
    views: number | null;
  }
): Promise<ReelScoreResult> {
  const anthropic = new Anthropic({ apiKey });

  const captionText = caption ? `\nCaption: "${caption}"` : '';
  const metricsText = engagementMetrics 
    ? `\nEngagement: ${engagementMetrics.likes} likes, ${engagementMetrics.comments} comments${engagementMetrics.views ? `, ${engagementMetrics.views} views` : ''}`
    : '';

  const prompt = `You are analyzing an Instagram Reel for its viral potential and content quality.

Video Transcription (speech-to-text): "${transcription}"${captionText}${metricsText}

Analyze this Reel across three dimensions (each 0-100):
1. FRESHNESS - Is the content trendy, timely, relevant to current interests?
2. VIRALITY - Does it have emotional hooks, shareability, broad appeal?
3. QUALITY - Is the message clear, valuable, well-structured?

Then calculate an OVERALL SCORE (0-100) that represents the Reel's potential for repurposing into new content.

Scoring guide:
- 90-100: Outstanding - perfect for repurposing, highly engaging
- 70-89: Strong potential - good content, worth using
- 50-69: Moderate - acceptable, but needs work
- 0-49: Weak - skip or heavily modify

Respond in JSON format:
{
  "score": <overall score 0-100>,
  "comment": "<1-2 sentence explanation in Russian>",
  "freshnessScore": <0-100>,
  "viralityScore": <0-100>,
  "qualityScore": <0-100>
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    score: Math.min(100, Math.max(0, result.score)),
    comment: result.comment || "Оценка контента Reels",
    freshnessScore: typeof result.freshnessScore === 'number' ? Math.min(100, Math.max(0, result.freshnessScore)) : undefined,
    viralityScore: typeof result.viralityScore === 'number' ? Math.min(100, Math.max(0, result.viralityScore)) : undefined,
    qualityScore: typeof result.qualityScore === 'number' ? Math.min(100, Math.max(0, result.qualityScore)) : undefined,
  };
}

export async function scoreText(
  apiKey: string,
  text: string,
): Promise<{ score: number }> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are analyzing a video script scene for its viral potential in short-form video content.

Scene Text: "${text}"

Rate this scene's engagement and viral potential from 0-100, where:
- 90-100: Extremely engaging - powerful hook, emotional, memorable
- 70-89: High engagement - interesting, clear message, good pacing
- 50-69: Moderate engagement - decent content, room for improvement
- 0-49: Low engagement - weak hook, unclear, needs work

Consider:
- Hook strength (first 2-3 words)
- Clarity and conciseness
- Emotional impact
- Visual appeal
- Shareability

Respond ONLY with JSON format (no markdown, no backticks):
{
  "score": <number 0-100>
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    score: Math.min(100, Math.max(0, result.score)),
  };
}

export async function analyzeScript(
  apiKey: string,
  format: string,
  content: string,
): Promise<ScriptAnalysis> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a professional video script analyzer with a team of AI agents (Hook Expert, Structure Analyst, Emotional Analyst, CTA Expert). Analyze this content for ${format} format video.

Content: "${content}"

Task 1: Break it down into 3-5 compelling scenes for short-form video. For each scene:
1. Write the scene text (compelling, punchy, engaging)
2. Score its viral potential (0-100)
3. Generate 3 alternative rewrite variants

Task 2: As a multi-agent team, provide scene-by-scene improvement recommendations:
- Hook Expert: Analyze attention grab, first 3 seconds, pattern interrupts
- Structure Analyst: Analyze pacing, transitions, information density
- Emotional Analyst: Analyze emotional resonance, relatability, impact
- CTA Expert: Analyze ending, call-to-action, shareability

For each recommendation include:
- sceneNumber: which scene this applies to (1, 2, 3, etc.)
- area: "hook" | "structure" | "emotional" | "cta"
- priority: "high" | "medium" | "low"  
- current: current text from the scene
- suggested: improved version
- reasoning: why this change improves virality
- expectedImpact: expected score improvement (e.g., "+15 points")

Respond in JSON format:
{
  "format": "${format}",
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "<scene text in Russian>",
      "score": <0-100>,
      "variants": ["<variant 1>", "<variant 2>", "<variant 3>"]
    }
  ],
  "recommendations": [
    {
      "sceneNumber": 1,
      "area": "hook",
      "priority": "high",
      "current": "<current text>",
      "suggested": "<improved text>",
      "reasoning": "<why this improves virality>",
      "expectedImpact": "+15 points"
    }
  ],
  "overallScore": <0-100>,
  "overallComment": "<1-2 sentence analysis in Russian>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response");
  }

  const result = JSON.parse(jsonMatch[0]);
  return result;
}

export async function generateAiPrompt(
  apiKey: string,
  shotInstructions: string,
  sceneText?: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a professional video production assistant. Generate a detailed visual prompt for B-roll stock footage based on these shot instructions.

Shot Instructions: "${shotInstructions}"
${sceneText ? `Scene Context: "${sceneText}"` : ''}

Create a concise, visual prompt for stock video generation that:
1. Describes the main visual elements
2. Specifies camera movement and framing
3. Sets the mood and atmosphere
4. Includes relevant details about lighting, colors, setting

Keep it under 200 characters. Focus on visuals only, no text or narration.

Respond with ONLY the prompt text, nothing else.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  return textContent.text.trim();
}
