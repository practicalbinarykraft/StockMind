import Anthropic from "@anthropic-ai/sdk";
import { MAX_TOKENS_LONG } from "./base/constants";

/**
 * Translate text from English to Russian using Claude
 * Optimized for speed: translates in chunks if text is too long
 */
export async function translateToRussian(
  apiKey: string,
  text: string
): Promise<string> {
  // Limit to reasonable size for translation (8000 chars = ~2000 words)
  // This is enough for most articles while keeping response time reasonable
  const MAX_TEXT_LENGTH = 8000;
  const sanitizedText = text.length > MAX_TEXT_LENGTH 
    ? text.substring(0, MAX_TEXT_LENGTH) + "\n\n[... текст обрезан для ускорения перевода ...]"
    : text;

  // Escape quotes for JSON safety
  const escapedText = sanitizedText.replaceAll('"', '\\"').replaceAll('\n', '\\n');

  const prompt = `You are a professional translator. Translate the following English text to Russian.

IMPORTANT: 
- Preserve the original meaning and tone
- Keep technical terms and proper nouns in English if they are commonly used in Russian tech/business context
- Maintain formatting and structure (preserve \\n for line breaks)
- Return ONLY the translated text, no explanations or comments
- Be concise and natural in Russian

English text:
"${escapedText}"

Russian translation:`;

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: MAX_TOKENS_LONG, // Increased for longer translations
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Restore line breaks
  return textContent.text.trim().replaceAll('\\n', '\n');
}

