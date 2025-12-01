import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // 1. Fetch Context (Limit history to last 3 to save speed)
    const { data: interview } = await supabase
      .from("interviews")
      .select("cached_context")
      .eq("id", interviewId)
      .single();

    const { data: history } = await supabase
      .from("chat_logs")
      .select("role, content")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: false }) // Get newest first
      .limit(3); // ONLY read last 3 messages for speed

    const prevChat = history?.reverse().map(m => `${m.role}: ${m.content}`).join("\n") || "";
    const systemInstruction = interview?.cached_context || "You are a professional interviewer.";

    // 2. NEW MODEL: Native Audio Preview
    // This model generates audio DIRECTLY (No text step first)
    const model = "gemini-2.5-flash-native-audio-preview-09-2025";

    const prompt = `
      ${systemInstruction}
      RECENT HISTORY: ${prevChat}
      CANDIDATE SAID: ${transcript}
      
      TASK: Respond naturally to the candidate. Keep it brief.
    `;

    console.log("Generating Native Audio...");
    
    const result = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseModalities: ["AUDIO"], // Force Audio Output
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } // Use a specific voice
        }
      } as any
    });

    const rawPcm = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!rawPcm) throw new Error("No audio generated");

    // Note: Native Audio models sometimes don't return text, only audio.
    // We provide a placeholder text for the database logs.
    return NextResponse.json({ 
      text: "(Audio Response)", 
      audioBase64: addWavHeader(rawPcm) 
    });

  } catch (error: any) {
    console.error("SPEAK ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}