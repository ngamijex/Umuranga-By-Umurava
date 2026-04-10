import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;

export const getGeminiModel = (): GenerativeModel => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  if (!geminiModel) {
    geminiModel = geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }

  return geminiModel;
};
