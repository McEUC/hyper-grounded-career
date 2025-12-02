import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SAFETY_INSTRUCTION = "CRITICAL: IF user mentions self-harm, STOP and refer to 988. NEVER claim to be human.";

export async function POST(req: Request) {
  try {
    const {
      mode, // "FREE" | "CUSTOM"
      jobUrl,
      role, // "Project Manager" etc (for FREE mode)
      resumeText,
      tone, // "Neutral", "Intense", etc.
      interactionType // "Interviewer" | "Colleague"
    } = await req.json();

    console.log(`Starting Deep Research. Mode: ${mode}, Role: ${role}, URL: ${jobUrl}`);

    // Construct the input prompt based on mode
    let contextInput = "";
    let researchTask = "";

    if (mode === "CUSTOM") {
      contextInput = `
        TARGET JOB URL: ${jobUrl}
        USER RESUME BIO: "${resumeText?.substring(0, 5000) || "No resume provided."}"
      `;
      researchTask = `
        1. Use Google Search to analyze the URL and the Company.
        2. Identify the specific tech stack, company values, and recent news.
      `;
    } else {
      contextInput = `
        TARGET ROLE: ${role}
        USER RESUME BIO: "${resumeText?.substring(0, 5000) || "No resume provided."}"
      `;
      researchTask = `
        1. Access your internal knowledge about the role: "${role}".
        2. Identify standard industry interview questions and mental models for this role.
      `;
    }

    // Tone & Interaction Modifiers
    const toneInstruction = `
      TONE SETTING: ${tone}
      INTERACTION MODE: ${interactionType}

      ${interactionType === "Colleague"
        ? "Act as a peer/coworker having a coffee chat or technical discussion. Be less formal, use industry slang, but verify technical depth."
        : "Act as a formal interviewer. Be professional, structured, and probe for competency."}

      ${tone === "Intense" ? "Be challenging. Interrupt politely if the answer is vague. Drill down deep." : ""}
      ${tone === "Friendly" ? "Be encouraging and warm. Help the candidate feel at ease." : ""}
      ${tone === "Skeptical" ? "Be doubtful. Ask for proof or examples often. Assume the user might be bluffing." : ""}
    `;

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
              ${contextInput}

              TASK:
              ${researchTask}

              OUTPUT GENERATION:
              Create a SYSTEM PROMPT for the AI Agent who will play this persona.

              The System Prompt must include:
              1. WHO they are (Role, Title, Company context if known).
              2. HOW they speak (Jargon, length of answers).
              3. WHAT they are looking for (Key skills).
              4. SPECIFIC INSTRUCTIONS:
                 ${toneInstruction}

              OUTPUT:
              Return ONLY the raw System Prompt text. 
              Do NOT include markdown code blocks or explanations. Just the prompt.
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
