
import { GoogleGenAI, Type } from "@google/genai";
import { PhysicsLesson } from "../types";

const FALLBACK_LESSONS: PhysicsLesson[] = [
    {
        concept: "Gravity",
        question: "Why does the monkey speed up as it swings downward?",
        options: [
            "Gravity converts Potential Energy to Kinetic Energy",
            "Air resistance pushes it down",
            "The rope gets shorter",
            "Magic"
        ],
        correctAnswerIndex: 0,
        explanation: "As you fall, your height decreases (losing Potential Energy) and your speed increases (gaining Kinetic Energy) due to gravitational acceleration.",
        funFact: "On Jupiter, you would swing 2.4x faster because gravity is stronger!",
        diagram: {
            title: "Energy Conversion",
            vectors: [
                { label: "Gravity (mg)", start: [0,0], end: [0, 50], color: "#FF5252" },
                { label: "Velocity (v)", start: [0,0], end: [40, 20], color: "#448AFF" }
            ],
            labels: [
                { text: "PE -> KE", position: [20, -20] }
            ]
        }
    }
];

export const generatePhysicsLesson = async (stats: { distance: number, score: number, biome: string, maxSpeed: number, causeOfDeath?: string }, topic: string = "General"): Promise<PhysicsLesson> => {
  if (!process.env.API_KEY) return FALLBACK_LESSONS[0];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert Physics Tutor and AI Game Director for 'PolyJungle Swing'.
      The player controls a monkey (mass ~50kg) swinging on a rope in a 2D environment.
      
      TELEMETRY DATA:
      - Biome: ${stats.biome}
      - Max Speed Reached: ${stats.maxSpeed.toFixed(1)} m/s
      - Final Distance: ${stats.distance}m
      - Cause of Ending: ${stats.causeOfDeath || "Level Complete"}
      - Player Choice: They want to learn about ${topic}.
      
      TASK 1 (TEACH):
      Generate a multiple choice physics question about ${topic} based on this specific run.
      - If topic is ENERGY, ask about KE/PE conversion.
      - If topic is FORCES, ask about Tension or Gravity.
      - If topic is MOTION, ask about Velocity, Acceleration, or Projectile Motion.
      
      TASK 2 (DIRECT):
      As the Game Director, analyze their performance.
      - If they died early (<200m), act as a helper: Lower Gravity (0.8x) or Increase Rope Strength.
      - If they did well (>500m), challenge them: Increase Gravity (1.1x) or Speed.
      Output a 'gameTweak' object with the modification.
      
      Also provide data to draw a simple vector diagram.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                concept: { type: Type.STRING, description: "Main concept (e.g. 'Tension')" },
                question: { type: Type.STRING, description: "The multiple choice question." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 possible answers." },
                correctAnswerIndex: { type: Type.INTEGER, description: "Index of correct answer (0-3)." },
                explanation: { type: Type.STRING, description: "Brief explanation of the answer." },
                funFact: { type: Type.STRING, description: "Fun related fact." },
                gameTweak: {
                    type: Type.OBJECT,
                    properties: {
                        parameter: { type: Type.STRING, enum: ['GRAVITY', 'SPEED', 'JUMP_FORCE', 'ROPE_STRENGTH'] },
                        value: { type: Type.NUMBER, description: "Multiplier (e.g. 0.9)" },
                        message: { type: Type.STRING, description: "Message to player about the change." }
                    }
                },
                diagram: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        vectors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    start: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                    end: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                    color: { type: Type.STRING }
                                }
                            }
                        },
                        labels: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    position: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                                }
                            }
                        }
                    }
                }
            },
            required: ["concept", "question", "options", "correctAnswerIndex", "explanation", "funFact"]
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text) as PhysicsLesson;
    }
    return FALLBACK_LESSONS[0];

  } catch (error: any) {
    console.warn("Gemini API Error:", error);
    return FALLBACK_LESSONS[0];
  }
};
