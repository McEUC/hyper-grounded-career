import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 1. Initialize Clients
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper: WAV Header
function addWavHeader(base64Pcm: string): string {
  const pcmData = Buffer.from(base64Pcm, "base64");
  const header = Buffer.alloc(44);
  const dataLength = pcmData.length;
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmData]).toString("base64");
}

export async function POST(req: Request) {
  try {
    const { transcript, interviewId } = await req.json();

    // 2. Fetch Context (The Persona) & History from DB
    const { data: interview } = await supabase
      .from("interviews")
      .select("cached_context")
      .eq("id", interviewId)
      .single();

    const { data: history } = await supabase
      .from("chat_logs")
      .select("role, content")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: true })
      .limit(10); // Last 10 turns

    // 3. Construct the Prompt
    const systemInstruction = interview?.cached_context || "You are a helpful interviewer.";
    const conversationHistory = history?.map(msg => `${msg.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${msg.content}`).join("\n") || "";
    
    const prompt = `
      ${systemInstruction}
      
      HISTORY:
      ${conversationHistory}
      CANDIDATE: ${transcript}
      
      TASK:
      Reply to the candidate. 
      - If you are "HR", be professional. 
      - If you are "Tech", be skeptical and ask a follow-up technical question.
      - Keep it under 50 words.
      - Start your response with "HR:" or "Tech:" to indicate who is speaking.
    `;

    // 4. Generate Text Reply (Gemini 2.5 Flash - Fast)
    const textResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite", 
      contents: prompt,
    });
    
    const replyText = textResponse.text || "HR: I didn't catch that. Could you repeat?";

    // 5. Generate Audio (TTS)
    const audioResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash-tts",
      contents: replyText,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: "HR", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } },
              { speaker: "Tech", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
            ]
          }
        }
      } as any
    });

    const rawPcm = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!rawPcm) throw new Error("No audio generated");

    // 6. Return both Text (for DB) and Audio (for Ears)
    return NextResponse.json({ 
      text: replyText, 
      audioBase64: addWavHeader(rawPcm) 
    });

  } catch (error: any) {
    console.error("Reply Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}