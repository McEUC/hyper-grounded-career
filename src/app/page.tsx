import Link from "next/link";
import { ArrowRight, CheckCircle, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold border border-emerald-500/20">
            Now Powered by Gemini 3.0 Pro
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Don't Just Interview.<br />
            <span className="text-emerald-500">Speak the Language.</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            Most candidates fail because they sound like outsiders. Fluency AI uses Deep Research to simulate the exact corporate "dialect" of your target role.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard/interview" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
              Start Free Simulation <ArrowRight size={20} />
            </Link>
            <Link href="/about" className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* COMPARISON SECTION */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why We Are Different</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Generic Chatbots */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 opacity-70">
              <h3 className="text-xl font-bold mb-4 text-slate-500">Generic Chatbots (Character.ai)</h3>
              <ul className="space-y-3 text-slate-500">
                <li className="flex gap-2"><div className="text-red-400">✕</div> Relies on generic training data</li>
                <li className="flex gap-2"><div className="text-red-400">✕</div> Hallucinates company details</li>
                <li className="flex gap-2"><div className="text-red-400">✕</div> Entertainment focused</li>
              </ul>
            </div>

            {/* Fluency AI */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-950 border-2 border-emerald-500/50 relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3 right-8 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Professional Grade
              </div>
              <h3 className="text-xl font-bold mb-4">Fluency AI</h3>
              <ul className="space-y-3">
                <li className="flex gap-2"><CheckCircle size={20} className="text-emerald-500" /> <strong>Deep Research:</strong> Scrapes live job URLs</li>
                <li className="flex gap-2"><CheckCircle size={20} className="text-emerald-500" /> <strong>RAG Grounding:</strong> Knows the specific tech stack</li>
                <li className="flex gap-2"><CheckCircle size={20} className="text-emerald-500" /> <strong>Critique Engine:</strong> Scores your "Lingo Fit"</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-500 mb-12">Invest in your career for less than the cost of a lunch.</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold mb-2">The Curious</h3>
              <div className="text-4xl font-bold mb-6">$0</div>
              <ul className="text-left space-y-4 mb-8 text-slate-500">
                <li>• 1 Simulation / Day</li>
                <li>• Standard AI Model</li>
                <li>• Basic Feedback</li>
              </ul>
              <Link href="/dashboard/interview" className="block w-full py-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold hover:brightness-95 transition-all">
                Try Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-2xl border-2 border-emerald-500 relative bg-emerald-500/5 dark:bg-emerald-500/5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Job Seeker</h3>
              <div className="text-4xl font-bold mb-6">$12<span className="text-lg text-slate-500 font-normal">/mo</span></div>
              <ul className="text-left space-y-4 mb-8">
                <li className="flex gap-2"><Zap size={20} className="text-emerald-500" /> Unlimited Simulations</li>
                <li className="flex gap-2"><Zap size={20} className="text-emerald-500" /> <strong>Gemini 3 Pro</strong> Logic</li>
                <li className="flex gap-2"><Zap size={20} className="text-emerald-500" /> Resume Doctor Access</li>
              </ul>
              <button className="block w-full py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all">
                Go Pro
              </button>
            </div>

            {/* Agency Tier */}
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold mb-2">Career Builder</h3>
              <div className="text-4xl font-bold mb-6">$29<span className="text-lg text-slate-500 font-normal">/mo</span></div>
              <ul className="text-left space-y-4 mb-8 text-slate-500">
                <li>• Everything in Pro</li>
                <li>• <strong>Priority</strong> Voice Latency</li>
                <li>• Detailed "Lingo" Analytics</li>
              </ul>
              <button className="block w-full py-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}