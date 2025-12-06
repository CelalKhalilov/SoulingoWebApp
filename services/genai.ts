import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan } from "../types";

// Helper to get client with current key
export const getGenAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Lesson Generation ---
export const generateLesson = async (language: string, level: string, topic: string): Promise<LessonPlan> => {
  const ai = getGenAIClient();
  const prompt = `Create a structured 20-minute ${language} lesson for a ${level} student (instruction language: Turkish) interested in ${topic}.
  The response must be valid JSON matching the schema provided. 
  Ensure 'tips' are in Turkish. Vocabulary definitions should be in Turkish if possible.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          level: { type: Type.STRING },
          vocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
          sentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
              }
            }
          },
          tips: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response generated");
  return JSON.parse(response.text) as LessonPlan;
};

// --- Image Editing ---
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `${prompt}. (Provide any error messages or feedback in Turkish if generation fails)` }
      ]
    }
  });

  // Search for image part in response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
    return imagePart.inlineData.data;
  }
  throw new Error("No image returned from editing model");
};

// --- Pronunciation Analysis ---
export const analyzePronunciation = async (audioBase64: string, targetText?: string): Promise<string> => {
  const ai = getGenAIClient();
  
  let promptText = "Listen to this audio. Transcribe what was said, and then evaluate the pronunciation on a scale of 1-10 with specific tips for improvement (in Turkish).";
  
  if (targetText) {
    promptText = `Listen to this audio. The user is trying to say: "${targetText}". 
    1. Transcribe what they actually said.
    2. Compare it to the target text.
    3. Evaluate the pronunciation on a scale of 1-10.
    4. Provide specific tips for improvement in Turkish.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        { text: promptText }
      ]
    }
  });
  
  return response.text || "Could not analyze audio.";
};