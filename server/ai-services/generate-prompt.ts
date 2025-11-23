import Anthropic from "@anthropic-ai/sdk";
import { MAX_TOKENS_SHORT } from "./base/constants";

/**
 * Generate AI prompt for B-roll stock footage
 */
export async function generateAiPrompt(
  apiKey: string,
  shotInstructions: string,
  sceneText?: string
): Promise<string> {
  const sanitizedInstructions = shotInstructions.substring(0, 500).replaceAll('"', '\\"');
  const sanitizedScene = sceneText ? sceneText.substring(0, 500).replaceAll('"', '\\"') : undefined;

  const prompt = `You are a professional video production assistant. Generate a detailed visual prompt for B-roll stock footage based on these shot instructions.

Shot Instructions: "${sanitizedInstructions}"
${sanitizedScene ? `Scene Context: "${sanitizedScene}"` : ''}

Create a concise, visual prompt for stock video generation that:
1. Describes the main visual elements
2. Specifies camera movement and framing
3. Sets the mood and atmosphere
4. Includes relevant details about lighting, colors, setting

Keep it under 200 characters. Focus on visuals only, no text or narration.

Respond with ONLY the prompt text, nothing else.`;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: MAX_TOKENS_SHORT,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  return textContent.text.substring(0, 200).trim();
}
