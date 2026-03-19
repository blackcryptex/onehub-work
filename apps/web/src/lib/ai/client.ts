/**
 * OpenAI client configuration
 * Reusable client instance for AI operations
 */

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("[AI] OPENAI_API_KEY not set. AI features will not work.");
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return openai !== null;
}

