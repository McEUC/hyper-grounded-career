import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SAFETY_INSTRUCTION = "CRITICAL: IF user mentions self-harm, STOP and refer to 988. NEVER claim to be human.";

export async function POST(req: Request) {
  try {
    const { jobUrl, resumeText } = await req.json();

    console.log("Starting Deep Research on:", jobUrl);

    const response = await client.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            { 
              text: `${SAFETY_INSTRUCTION}
              
              CONTEXT: You are the "Persona Architect" for a Tech Career Simulator.
              
              INPUT DATA:
              1. JOB URL: ${jobUrl}
              2. RESUME BIO: "${resumeText.substring(0, 5000)}"

              TASK:
              1. Use Google Search to analyze the URL. 
                 CRITICAL: If the URL is blocked or generic, INFER the role based on the Resume Bio provided.
                 ASSUME the context is SOFTWARE ENGINEERING / DATA / TECH unless explicitly stated otherwise.
              2. Create a SYSTEM PROMPT for an AI Interviewer.

              OUTPUT:
              Return ONLY the raw System Prompt text. 
              The Persona MUST be a specific role (e.g., "Senior React Developer", "Data Scientist").
              Do NOT default to "Civil Engineer" or generic "Engineer". DO NOT describe physical actions, you are talking directly to a person like a normal interview. 
              ` 
            }
          ]
        }
      ],
      config: {
        thinkingLevel: "high",
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      } as any, 
    });

    const systemPrompt = response.text || "You are a professional interviewer.";

    return NextResponse.json({ result: systemPrompt });
  } catch (error) {
    console.error("Research Error:", error);
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}