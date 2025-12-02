"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Briefcase, Play, Square, Settings, User, Globe, FileText, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Tone = "Neutral" | "Intense" | "Friendly" | "Skeptical";
type InteractionType = "Interviewer" | "Colleague";

export default function InterviewCall() {
  // Navigation State
  const [step, setStep] = useState<"MODE" | "INPUT" | "CONFIG" | "RESEARCH" | "INTERVIEW" | "REPORT">("MODE");

  // Configuration State
  const [mode, setMode] = useState<"FREE" | "CUSTOM">("FREE");
  const [genericRole, setGenericRole] = useState("Project Manager");
  const [jobUrl, setJobUrl] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState<Tone>("Neutral");
  const [interactionType, setInteractionType] = useState<InteractionType>("Interviewer");

  // Runtime State
  const [status, setStatus] = useState("Idle"); 
  const [researchData, setResearchData] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(""); // Accumulates speech
  const [textInput, setTextInput] = useState(""); // For manual typing
  
  // Data State
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. SETUP: Auto-Login & Speech Init
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        // Auto-login placeholder for demo
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
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            }
          }
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            // Auto-send could happen here, but we stick to "Release to Send" model for voice
          }
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 2. ACTION: Research & Save Interview
  const handleResearch = async () => {
    if (!userId) return;
    setStep("RESEARCH");
    setStatus("Building Persona...");
    
    try {
      // A. Call Gemini 3 (Deep Research)
      const res = await fetch("/api/research", {
        method: "POST",
        body: JSON.stringify({
          mode,
          jobUrl,
          role: genericRole,
          resumeText,
          tone,
          interactionType
        }),
      });
      const data = await res.json();
      setResearchData(data.result);
      
      // B. Save to Supabase
      const { data: interview, error } = await supabase
        .from("interviews")
        .insert({
          user_id: userId,
          job_url: mode === "CUSTOM" ? jobUrl : `Generic: ${genericRole}`,
          cached_context: data.result // The Persona System Prompt
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (interview) {
        setInterviewId(interview.id);
        setStatus("Ready");
        setStep("INTERVIEW");

        // Initial Greeting
        await handleAiReply("The session is starting. Please introduce yourself.", interview.id);
      }

    } catch (e) {
      console.error(e);
      setStatus("Error fetching job");
      // Go back to config if error
      setStep("CONFIG");
    }
  };

  // 3. ACTION: Context Loop (Speak + Reply)
  const handleAiReply = async (userText: string, forceId?: string) => {
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
          interviewId: activeId
        }),
      });
      const data = await res.json();
      
      if (data.text) {
         await supabase.from("chat_logs").insert({
          interview_id: activeId,
          role: "ai",
          content: data.text
        });
      }

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

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus("AI Thinking...");
      
      if (transcript && interviewId) {
        await supabase.from("chat_logs").insert({
          interview_id: interviewId,
          role: "user",
          content: transcript
        });

        await handleAiReply(transcript);
        setTranscript(""); // Clear buffer
      } else {
         setStatus("Listening...");
      }
    }
  };

  // Handle Text Input Submission
  const handleTextSubmit = async () => {
    if (!textInput.trim() || !interviewId) return;

    const msg = textInput;
    setTextInput(""); // Clear immediately
    setStatus("AI Thinking...");

    await supabase.from("chat_logs").insert({
      interview_id: interviewId,
      role: "user",
      content: msg
    });

    await handleAiReply(msg);
  };

  // 5. ACTION: End & Critique
  const endInterview = async () => {
    if (!interviewId) return;
    setStatus("Generating Report...");
    setStep("REPORT");
    
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

  // --- RENDER HELPERS ---

  const renderStepMode = () => (
    <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
      <button
        onClick={() => { setMode("FREE"); setStep("INPUT"); }}
        className="group relative p-8 rounded-2xl bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all text-left"
      >
        <div className="absolute top-4 right-4 bg-slate-800 text-xs px-2 py-1 rounded text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">Free Trial</div>
        <User size={40} className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-2xl font-bold text-white mb-2">Standard Role</h3>
        <p className="text-slate-400">Practice with a generic persona like "Product Manager" or "Data Scientist". Good for warm-ups.</p>
      </button>

      <button
        onClick={() => { setMode("CUSTOM"); setStep("INPUT"); }}
        className="group relative p-8 rounded-2xl bg-slate-900 border border-slate-700 hover:border-purple-500 hover:bg-slate-800 transition-all text-left"
      >
        <div className="absolute top-4 right-4 bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded border border-purple-500/50">Pro Feature</div>
        <Globe size={40} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-2xl font-bold text-white mb-2">Deep Research</h3>
        <p className="text-slate-400">Paste a specific Job URL. Our agents research the company news, stack, and culture for a hyper-realistic sim.</p>
      </button>
    </div>
  );

  const renderStepInput = () => (
    <div className="w-full max-w-md space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 text-slate-400 mb-4 cursor-pointer hover:text-white" onClick={() => setStep("MODE")}>
        ← Back
      </div>

      {mode === "FREE" ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Select Role</label>
          <select
            value={genericRole}
            onChange={(e) => setGenericRole(e.target.value)}
            className="w-full p-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option>Project Manager</option>
            <option>Data Scientist</option>
            <option>Solution Architect</option>
            <option>Software Engineer (Frontend)</option>
            <option>Software Engineer (Backend)</option>
            <option>Product Marketing Manager</option>
            <option>Sales Representative</option>
          </select>
        </div>
      ) : (
         <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Target Job URL</label>
            <input
              type="text"
              placeholder="https://linkedin.com/jobs/..."
              className="w-full p-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Context</label>
        <textarea
          placeholder="Paste your Resume text or a short bio here..."
          className="w-full p-4 h-32 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
      </div>

      <button
        onClick={() => setStep("CONFIG")}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-lg transition-all"
      >
        Next: Configure Persona →
      </button>
    </div>
  );

  const renderStepConfig = () => (
    <div className="w-full max-w-md space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 text-slate-400 mb-4 cursor-pointer hover:text-white" onClick={() => setStep("INPUT")}>
        ← Back
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={24} /> Simulation Settings</h3>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Persona Vibe</label>
          <div className="grid grid-cols-2 gap-2">
            {(["Neutral", "Friendly", "Intense", "Skeptical"] as Tone[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${tone === t ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Role Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(["Interviewer", "Colleague"] as InteractionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setInteractionType(t)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${interactionType === t ? "bg-purple-600 border-purple-500 text-white" : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            {interactionType === "Interviewer" ? "Formal critique mode. Good for prep." : "Casual coffee chat. Good for networking practice."}
          </p>
        </div>
      </div>

      <button
        onClick={handleResearch}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
      >
        <Play size={24} fill="currentColor" /> Start Simulation
      </button>
    </div>
  );

  const renderStepResearch = () => (
    <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
        <Briefcase size={64} className="text-emerald-500 relative z-10" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-white">Constructing Persona...</h3>
        <p className="text-slate-400">Analyzing Job Description • Scraping Company News • Aligning Tone</p>
      </div>
    </div>
  );

  const renderStepInterview = () => (
    <div className="flex flex-col items-center w-full max-w-lg animate-in fade-in duration-500">
       <div className="mb-8 text-xl font-mono text-emerald-400 h-8 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === "Speaking..." ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`}></div>
        {status}
      </div>

      {/* Voice Interface */}
      <div className="relative group">
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          disabled={status === "Speaking..."}
          className={`
            w-40 h-40 rounded-full flex items-center justify-center transition-all duration-200 select-none relative z-10
            ${status === "Listening..."
              ? "bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] scale-110"
              : "bg-slate-800 border-4 border-slate-700 hover:bg-slate-700 active:scale-95"}
            ${status === "Speaking..." ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {status === "Listening..." ? <Mic size={60} className="text-white animate-bounce" /> : <Mic size={50} className="text-slate-400" />}
        </button>
        {/* Pulse rings */}
        {status === "Speaking..." && (
           <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping"></div>
        )}
      </div>

      <p className="mt-6 text-slate-500 text-sm font-medium tracking-wide">HOLD TO SPEAK • RELEASE TO SEND</p>

      {/* Text Fallback */}
      <div className="w-full mt-8 flex gap-2">
        <input
          type="text"
          placeholder="Or type your response here..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
          disabled={status === "Speaking..." || status === "AI Thinking..."}
        />
        <button
          onClick={handleTextSubmit}
          disabled={!textInput.trim() || status !== "Listening..." && status !== "Idle" && status !== "Ready"}
          className="bg-slate-800 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-slate-800 text-white p-3 rounded-lg transition-colors"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Transcript Log (Visual Feedback) */}
      <div className="mt-6 w-full p-6 bg-slate-950/50 rounded-xl border border-slate-800/50 min-h-[100px] max-h-[200px] overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Live Transcript</h3>
        <p className="text-lg text-slate-300 font-medium">
          {transcript || <span className="text-slate-700 italic">...</span>}
        </p>
      </div>

      <button
        onClick={endInterview}
        className="mt-12 px-6 py-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-semibold uppercase text-xs tracking-widest transition-all"
      >
        End Session
      </button>
    </div>
  );

  const renderStepReport = () => (
    <div className="w-full max-w-3xl bg-slate-900 p-8 rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
      {!feedback ? (
        <div className="flex flex-col items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-slate-400">Compiling Executive Critique...</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-white mb-1">Performance Review</h2>
                <p className="text-slate-400 text-sm">Role: {mode === "CUSTOM" ? "Custom Position" : genericRole} • Mode: {tone} {interactionType}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase font-bold">Fluency Score</div>
                    <div className={`text-5xl font-black ${feedback.score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                    {feedback.score}
                    </div>
                </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
              <h3 className="text-slate-400 text-xs uppercase tracking-widest mb-3 font-bold">Executive Summary</h3>
              <p className="text-slate-200 leading-relaxed text-lg">{feedback.summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-950/20 p-6 rounded-xl border border-emerald-900/30">
                <h3 className="text-emerald-500 text-xs uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Strengths
                </h3>
                <ul className="space-y-3">
                  {feedback.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-emerald-100 text-sm flex gap-2 items-start">
                          <span className="text-emerald-500/50 mt-1">✓</span> {s}
                      </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-950/20 p-6 rounded-xl border border-red-900/30">
                <h3 className="text-red-500 text-xs uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Areas for Growth
                </h3>
                 <ul className="space-y-3">
                  {feedback.weaknesses?.map((w: string, i: number) => (
                      <li key={i} className="text-red-100 text-sm flex gap-2 items-start">
                           <span className="text-red-500/50 mt-1">!</span> {w}
                      </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-indigo-950/20 p-6 rounded-xl border border-indigo-900/30">
              <h3 className="text-indigo-400 text-xs uppercase tracking-widest mb-4 font-bold flex items-center gap-2">
                 <MessageSquare size={14} /> Dialect & Lingo Misses
              </h3>
              <div className="grid gap-3">
                 {feedback.lingo_misses?.map((m: string, i: number) => (
                     <div key={i} className="bg-indigo-900/20 px-4 py-2 rounded text-indigo-200 text-sm border border-indigo-500/20">
                         {m}
                     </div>
                 ))}
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="mt-10 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
          >
            Start New Simulation
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      {step !== "INTERVIEW" && step !== "REPORT" && (
        <div className="mb-12 text-center animate-fade-in-down">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text mb-2">
            Hyper-Grounded Career
            </h1>
            <p className="text-slate-500">Professional Fluency Engine</p>
        </div>
      )}

      {step === "MODE" && renderStepMode()}
      {step === "INPUT" && renderStepInput()}
      {step === "CONFIG" && renderStepConfig()}
      {step === "RESEARCH" && renderStepResearch()}
      {step === "INTERVIEW" && renderStepInterview()}
      {step === "REPORT" && renderStepReport()}
    </div>
  );
}
