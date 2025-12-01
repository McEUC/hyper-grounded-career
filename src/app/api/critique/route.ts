import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { interviewId } = await req.json();

    // 1. Gather Data (Job Context + All Chat Logs)
    const { data: interview } = await supabase
      .from("interviews")
      .select("job_url, cached_context")
      .eq("id", interviewId)
      .single();

    const { data: logs } = await supabase
      .from("chat_logs")
      .select("role, content")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true });

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: "No conversation found" }, { status: 400 });
    }

    // 2. Format the Transcript for the AI
    const transcript = logs.map(l => `${l.role.toUpperCase()}: ${l.content}`).join("\n");

    // 3. Gemini 3 Pro: The "Hiring Committee"
    // We ask for JSON output specifically.
    const prompt = `
      CONTEXT: You are the Lead Hiring Manager for the role described in: ${interview?.job_url}.
      SYSTEM CONTEXT: ${interview?.cached_context}

      TRANSCRIPT OF INTERVIEW:
      ${transcript}

      TASK:
      Analyze this candidate's performance. Be strict. 
      Compare their answers to the technical requirements of the job.
      
      OUTPUT FORMAT (JSON ONLY):
      {
        "score": (Integer 0-100),
        "summary": "2 sentence executive summary",
        "strengths": ["point 1", "point 2"],
        "weaknesses": ["point 1", "point 2"],
        "lingo_misses": ["Did not use term 'CI/CD'", "Said 'Java' instead of 'Kotlin'"]
      }
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingLevel: "high",
        responseMimeType: "application/json", // <--- Force JSON
      } as any,
    });

    const resultText = response.text || "{}";
    const feedbackJson = JSON.parse(resultText);

    // 4. Save to Database
    await supabase
      .from("interviews")
      .update({
        score: feedbackJson.score,
        feedback: feedbackJson,
        status: "completed"
      })
      .eq("id", interviewId);

    return NextResponse.json({ result: feedbackJson });

  } catch (error: any) {
    console.error("Critique Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}