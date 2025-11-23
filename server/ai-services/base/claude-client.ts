import Anthropic from "@anthropic-ai/sdk";
import { safeParseLLM } from "../../lib/safe-parse-llm";

/**
 * Call Claude API and parse JSON response
 * Used by all advanced AI agents
 */
export async function callClaude(
  apiKey: string,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<any> {
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: options.model || "claude-sonnet-4-5",
    max_tokens: options.maxTokens || 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response using safe parser (handles malformed JSON from Claude)
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse AI response as JSON");
  }

  return safeParseLLM(jsonMatch[0], 'Claude API response');
}
