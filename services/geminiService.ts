
import { GoogleGenAI, Type } from "@google/genai";
import { MissionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateMission = async (): Promise<MissionData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a cyberpunk shooter mission briefing. Make it sound cool and tech-heavy.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            objective: { type: Type.STRING },
            difficulty: { 
              type: Type.STRING,
              enum: ['Easy', 'Medium', 'Hard', 'Nightmare']
            },
          },
          required: ["title", "description", "objective", "difficulty"],
        },
      },
    });

    const data = JSON.parse(response.text);
    return data;
  } catch (error) {
    console.error("Failed to generate mission:", error);
    return {
      title: "Operation: Dark Grid",
      description: "Neural link established. Eliminate rogue data nodes in the neon sector.",
      objective: "Survive as long as possible against the automated defense drones.",
      difficulty: "Hard"
    };
  }
};
