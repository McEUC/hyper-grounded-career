"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Briefcase, TrendingUp, FileText, ArrowRight, Zap, Clock } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
      // 1. Force Auth Check (Same logic as Interview page)
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If not logged in, try to sign in as the Dev User
        const { data: loginData } = await supabase.auth.signInWithPassword({
             email: "dev@hypergrounded.com",
             password: "password123",
        });
        user = loginData.user;
      }

      if (!user) return; // Should not happen

      // 2. Fetch Profile Metrics
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      // 3. Fetch Recent Interviews
      const { data: interviewData } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (interviewData) setInterviews(interviewData);
      setLoading(false);
    };

    initData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Get Current User (Or Ghost User)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // In a real app, redirect to login

      // 2. Fetch Profile Metrics
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      // 3. Fetch Recent Interviews
      const { data: interviewData } = await supabase
        .from("interviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (interviewData) setInterviews(interviewData);

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Command Center...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Command Center</h1>
            <p className="text-slate-500 mt-1">Track your professional fluency evolution.</p>
          </div>
          <Link 
            href="/dashboard/interview"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Zap size={20} /> New Simulation
          </Link>
        </div>

        {/* METRICS GRID (The "Professional DNA") */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Technical Accuracy */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                <Briefcase size={24} />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Technical Accuracy</h3>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {profile?.metrics?.technical_accuracy || 50}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000" 
                style={{ width: `${profile?.metrics?.technical_accuracy || 50}%` }}
              ></div>
            </div>
          </div>

          {/* Card 2: Confidence Score */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Confidence Score</h3>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {profile?.metrics?.confidence || 50}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full transition-all duration-1000" 
                style={{ width: `${profile?.metrics?.confidence || 50}%` }}
              ></div>
            </div>
          </div>

          {/* Card 3: Interviews Completed */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Clock size={24} />
              </div>
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Simulations Run</h3>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {interviews.length}
            </div>
            <p className="text-sm text-slate-500">Keep practicing to improve scores.</p>
          </div>
        </div>

        {/* RECENT HISTORY TABLE */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent History</h2>
            <button className="text-sm text-emerald-500 font-semibold hover:text-emerald-400">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-6 font-semibold">Target Job</th>
                  <th className="p-6 font-semibold">Date</th>
                  <th className="p-6 font-semibold">Score</th>
                  <th className="p-6 font-semibold">Status</th>
                  <th className="p-6 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      No simulations run yet. Start your first one!
                    </td>
                  </tr>
                ) : (
                  interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-6 font-medium max-w-xs truncate">
                        {interview.job_url.replace('https://', '').substring(0, 30)}...
                      </td>
                      <td className="p-6 text-slate-500">
                        {new Date(interview.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-6">
                        {interview.score ? (
                          <span className={`font-bold ${interview.score >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
                            {interview.score}/100
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="p-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${interview.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}
                        `}>
                          {interview.status || 'In Progress'}
                        </span>
                      </td>
                      <td className="p-6">
                        <Link href="/dashboard/interview" className="text-slate-400 hover:text-white transition-colors">
                          <ArrowRight size={20} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESUME DOCTOR TEASER (Next Feature) */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="text-indigo-400" />
              <h3 className="text-indigo-200 font-semibold uppercase tracking-wider text-sm">New Feature</h3>
            </div>
            <h2 className="text-3xl font-bold mb-4">Resume Doctor is Ready.</h2>
            <p className="text-indigo-200 max-w-xl mb-8">
              Your recent simulation showed gaps in your "Lingo Fit." 
              Gemini 3 can rewrite your resume to match the job description perfectly.
            </p>
            <button className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
              Analyze My Resume
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}