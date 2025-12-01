"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Briefcase, Play, Square } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function InterviewCall() {
  const [jobUrl, setJobUrl] = useState("");
  const [status, setStatus] = useState("Idle"); 
  const [researchData, setResearchData] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(""); 
  
  // Data State
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  // 1. SETUP: Auto-Login & Speech Init
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: "dev@hypergrounded.com",
          password: "password123", 
        });
        
        if (error) {
           const { data: loginData } = await supabase.auth.signInWithPassword({
             email: "dev@hypergrounded.com",
             password: "password123",
           });
           setUserId(loginData.user?.id || null);
        } else {
          setUserId(data.user?.id || null);
        }
      }
    };
    initAuth();

    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; 
        recognition.interimResults = true; 
        recognition.lang = "en-US";
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const current = event.results[event.results.length - 1][0].transcript;
          setTranscript(current);
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 2. ACTION: Research & Save Interview
  // Added 'resumeText' argument from previous step
  const handleResearch = async (resumeText: string) => {
    if (!jobUrl || !userId) return;
    setStatus("Researching Job...");
    setTranscript(""); // Clear input for next phase
    
    try {
      // A. Call Gemini 3 (Deep Research)
      const res = await fetch("/api/research", {
        method: "POST",
        body: JSON.stringify({ jobUrl, resumeText }),
      });
      const data = await res.json();
      setResearchData(data.result);
      
      // B. Save to Supabase
      const { data: interview, error } = await supabase
        .from("interviews")
        .insert({
          user_id: userId,
          job_url: jobUrl,
          cached_context: data.result // The Persona System Prompt
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (interview) {
        // RACE CONDITION FIX:
        // 1. Set the state for the UI (Slow)
        setInterviewId(interview.id);
        
        // 2. Pass the RAW ID to the function immediately (Fast)
        // This prevents the "null ID" error that caused the hallucination.
        setStatus("Ready");
        await handleAiReply("The interview is starting. Please introduce yourself.", interview.id);
      }

    } catch (e) {
      console.error(e);
      setStatus("Error fetching job");
    }
  };

  // 3. ACTION: Context Loop (Speak + Reply)
  // Added 'forceId' to bypass React state lag
  const handleAiReply = async (userText: string, forceId?: string) => {
    // CRITICAL FIX: Use the forced ID if available, otherwise fallback to state
    const activeId = forceId || interviewId;

    if (!activeId || !userId) {
      console.error("Missing ID in handleAiReply", { activeId, userId });
      return;
    }

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        body: JSON.stringify({ 
          transcript: userText,
          interviewId: activeId // Send the valid ID
        }),
      });
      const data = await res.json();
      
      // Save AI's Reply to DB
      if (data.text) {
         await supabase.from("chat_logs").insert({
          interview_id: activeId,
          role: "ai",
          content: data.text
        });
      }

      // Play Audio
      if (data.audioBase64) {
        setStatus("Speaking...");
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.onended = () => setStatus("Listening...");
        audio.play();
      }
    } catch (e) {
      console.error(e);
      setStatus("Error Speaking");
    }
  };

  const startListening = () => {
    if (status === "Speaking...") return;
    if (recognitionRef.current) {
      setTranscript("");
      recognitionRef.current.start();
      setStatus("Listening...");
    }
  };

  // 4. ACTION: Stop Listening & Send
  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus("AI Thinking...");
      
      // Use interviewId state here (Safe because user interaction happens AFTER init)
      if (transcript && interviewId) {
        // A. Save User Log
        await supabase.from("chat_logs").insert({
          interview_id: interviewId,
          role: "user",
          content: transcript
        });

        // B. Trigger AI Reply
        await handleAiReply(transcript);
      } else {
         setStatus("Listening...");
      }
    }
  };

  // 5. ACTION: End & Critique
  const endInterview = async () => {
    if (!interviewId) return;
    setStatus("Generating Report...");
    
    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        body: JSON.stringify({ interviewId }),
      });
      const data = await res.json();
      setFeedback(data.result);
      setStatus("Completed");
    } catch (e) {
      console.error(e);
      setStatus("Error generating report");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text">
          Hyper-Grounded Career
        </h1>
        <p className="text-slate-400 mt-2">Professional Fluency Engine</p>
      </div>

      {/* VIEW 1: SETUP FORM */}
      {!researchData ? (
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Target Role</label>
            <input
              type="text"
              placeholder="Paste Job URL (LinkedIn, Company Page)..."
              className="w-full p-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Experience</label>
            <textarea
              placeholder="Paste your Resume text or a short bio here..."
              className="w-full p-4 h-32 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              value={transcript} 
              onChange={(e) => setTranscript(e.target.value)} 
            />
          </div>

          <button 
            onClick={() => handleResearch(transcript)} 
            disabled={status !== "Idle" || !jobUrl}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2
              ${status === "Idle" && jobUrl ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "bg-slate-800 text-slate-500 cursor-not-allowed"}
            `}
          >
            {status === "Researching Job..." ? (
              <span className="animate-pulse">Building Knowledge Graph...</span>
            ) : (
              <>
                <Briefcase size={20} /> Initialize Persona
              </>
            )}
          </button>
        </div>
      ) : feedback ? (
        /* VIEW 3: REPORT CARD */
        <div className="w-full max-w-2xl bg-slate-900 p-8 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Interview Analysis</h2>
            <div className={`text-4xl font-black ${feedback.score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
              {feedback.score}/100
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Executive Summary</h3>
              <p className="text-slate-200 leading-relaxed">{feedback.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-950/30 p-4 rounded-lg border border-emerald-900/50">
                <h3 className="text-emerald-400 text-xs uppercase tracking-widest mb-2">Strengths</h3>
                <ul className="list-disc list-inside text-sm text-emerald-100 space-y-1">
                  {feedback.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              
              <div className="bg-red-950/30 p-4 rounded-lg border border-red-900/50">
                <h3 className="text-red-400 text-xs uppercase tracking-widest mb-2">Weaknesses</h3>
                <ul className="list-disc list-inside text-sm text-red-100 space-y-1">
                  {feedback.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>

            <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-900/50">
              <h3 className="text-indigo-400 text-xs uppercase tracking-widest mb-2">Lingo / Dialect Misses</h3>
              <ul className="list-disc list-inside text-sm text-indigo-100 space-y-1">
                 {feedback.lingo_misses?.map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
          >
            Start New Simulation
          </button>
        </div>
      ) : (
        /* VIEW 2: INTERACTIVE CALL */
        <div className="flex flex-col items-center w-full max-w-lg">
           <div className="mb-8 text-xl font-mono text-emerald-400 animate-pulse h-8">
            • {status}
          </div>
          
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            disabled={status === "Speaking..." || status === "Generating Report..."}
            className={`
              w-40 h-40 rounded-full flex items-center justify-center transition-all duration-200 select-none
              ${status === "Listening..." 
                ? "bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] scale-110" 
                : "bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 active:scale-95"}
              ${status === "Speaking..." ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {status === "Listening..." ? <Mic size={60} className="text-white animate-bounce" /> : <Mic size={50} className="text-slate-400" />}
          </button>

          <p className="mt-6 text-slate-500 text-sm">Hold to Speak • Release to Send</p>
          
          <div className="mt-8 w-full p-6 bg-slate-900 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Live Transcript</h3>
            <p className="text-lg text-white font-medium min-h-[3rem]">
              {transcript || <span className="text-slate-600 italic">Your voice text will appear here...</span>}
            </p>
          </div>

          <button 
            onClick={endInterview}
            className="mt-12 text-slate-500 hover:text-red-400 text-sm font-semibold uppercase tracking-widest transition-colors"
          >
            End Interview & Get Report
          </button>
        </div>
      )}
    </div>
  );
}