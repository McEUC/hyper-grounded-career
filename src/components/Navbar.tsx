"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
              <Briefcase size={20} />
            </div>
            <span>Fluency<span className="text-emerald-500">AI</span></span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex space-x-8 text-sm font-medium">
            <Link href="/" className="hover:text-emerald-500 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-emerald-500 transition-colors">About</Link>
            <Link href="/pricing" className="hover:text-emerald-500 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-emerald-500 transition-colors">Dashboard</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Link 
              href="/login"
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}