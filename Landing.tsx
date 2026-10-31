import React from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, TrendingUp, ShieldCheck, Sparkles, Mic, FileText, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-600 selection:text-white">
      {/* Header Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 h-20 border-b border-gray-800/80 bg-gray-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <span className="font-extrabold text-white text-base">F</span>
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">FinSight AI</span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Fintech Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/showcase"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/40 transition-colors"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Labs Showcase</span>
          </Link>
          <Link to="/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Main Hero */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/60 rounded-full px-4 py-1.5 text-blue-300 text-xs font-semibold mb-8 shadow-inner">
            <BrainCircuit size={15} className="text-blue-400" />
            <span>AI Personal Finance Intelligence & Zero-Knowledge Vault</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Understand your money.<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Forecast with certainty.
            </span>
          </h1>

          <p className="text-gray-400 text-base sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            India's most capable personal finance platform. Zero-knowledge document encryption, AI auto-sinking funds, real-time cashflow forecasting, and voice-assisted wealth management.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/signup"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-base shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/showcase"
              className="px-7 py-3.5 bg-gray-900 hover:bg-gray-800 text-gray-200 hover:text-white border border-gray-800 hover:border-gray-700 rounded-xl font-semibold text-base transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={16} className="text-amber-400" />
              <span>Explore 12 Interactive Labs</span>
            </Link>
          </div>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-20 text-left relative z-10">
          <div className="bg-gray-900/60 border border-gray-800/80 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">Smart Cashflow</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Predict your month-end surplus and savings rate based on real spending velocity.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">Zero-Knowledge Vault</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Client-side AES-256-GCM encryption with PIN protection. Your documents remain strictly private.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 hover:border-indigo-500/40 rounded-2xl p-6 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">Document Intelligence</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Auto-detects insurance renewals, loan expiries, and generates dynamic sinking funds.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 hover:border-purple-500/40 rounded-2xl p-6 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Mic size={20} />
            </div>
            <h3 className="font-bold text-white text-base mb-1.5">Voice Assistant</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Speak naturally to record expenses, inspect budgets, and receive instant portfolio summaries.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 py-8 px-6 text-center text-xs text-gray-500">
        <p>© 2026 FinSight AI — Client-Side Zero-Knowledge Personal Finance Intelligence Platform.</p>
      </footer>
    </div>
  );
}

