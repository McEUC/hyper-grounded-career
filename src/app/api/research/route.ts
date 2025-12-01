import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SAFETY_INSTRUCTION = "CRITICAL: IF user mentions self-harm, STOP and refer to 988. NEVER claim to be human.";

export async function POST(req: Request) {
  try {
    const { jobUrl, resumeText } = await req.json();

    console.log("Starting Deep Research on:", jobUrl);

    // GEMINI 3 PRO: The "Deep Research" Agent
    const response = await client.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            { 
              text: `${SAFETY_INSTRUCTION}
              
              CONTEXT: You are the "Persona Architect" for a high-fidelity career simulator.
              
              INPUT DATA:
              1. JOB URL: ${jobUrl}
              2. CANDIDATE RESUME: "${resumeText.substring(0, 5000)}"

              TASK:
              1. Use Google Search to analyze the company in the URL. Find their tech stack, recent news, and corporate values.
              2. Analyze the Candidate Resume to find "Knowledge Gaps" compared to the job.
              3. Create a SYSTEM PROMPT for an AI Interviewer that embodies this specific company's culture.

              OUTPUT:
              Return ONLY the raw System Prompt text. Do not output markdown. 
              The System Prompt must define:
              - The Persona (Name, Role, Tone - e.g., "Skeptical CTO").
              - The Company Context (Specific tools they use).
              - The Candidate's Weakness (What to probe).
              - The "Dialect" (Specific lingo to use).
              ` 
            }
          ]
        }
      ],
      config: {
        thinkingLevel: "high", // Force deep reasoning
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      } as any, 
    });

    const systemPrompt = response.text || "You are a helpful interviewer.";

    return NextResponse.json({ result: systemPrompt });
  } catch (error) {
    console.error("Research Error:", error);
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}