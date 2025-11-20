import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

const FALLBACK_QUOTES = [
  "The jungle is silent, but your spirit speaks loud.",
  "A true monkey needs no words to know they swung well.",
  "The trees whisper of your greatness.",
  "Even the spirits are resting now, but good run!",
  "Legend says the API quota is the only thing that can stop you.",
  "Swinging through the code limits, I see."
];

export const getJungleQuote = async (score: number, distance: number): Promise<string> => {
  if (!API_KEY) return "The jungle is silent... (Configure API Key)";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a wise and slightly sarcastic old jungle spirit. A monkey just finished a run in the jungle swinging game.
      They scored ${score} points and traveled ${distance} meters.
      Give them a one-sentence witty quote or proverb about their performance.
      If the score is low, tease them gently. If high, praise them in a mystical way.`,
    });
    return response.text || "The spirits are contemplating...";
  } catch (error: any) {
    // Gracefully handle quota exhaustion
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
        console.warn("Gemini API Quota Exceeded - Using fallback quote.");
        return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    }
    console.error("Gemini API Error:", error);
    return "The jungle spirits are unreachable right now.";
  }
};