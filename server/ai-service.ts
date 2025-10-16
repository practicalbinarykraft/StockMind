import Anthropic from "@anthropic-ai/sdk";

export interface NewsScoreResult {
  score: number;
  comment: string;
}

export interface SceneAnalysis {
  sceneNumber: number;
  text: string;
  score: number;
  variants: string[];
}

export interface ScriptAnalysis {
  format: string;
  scenes: SceneAnalysis[];
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

export async function analyzeScript(
  apiKey: string,
  format: string,
  content: string,
): Promise<ScriptAnalysis> {
  const anthropic = new Anthropic({ apiKey });

  const prompt = `You are a professional video script analyzer. Analyze this content for ${format} format video.

Content: "${content}"

Break it down into 3-5 compelling scenes for short-form video. For each scene:
1. Write the scene text (compelling, punchy, engaging)
2. Score its viral potential (0-100)
3. Generate 3 alternative rewrite variants

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
  "overallScore": <0-100>,
  "overallComment": "<1-2 sentence analysis in Russian>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
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
