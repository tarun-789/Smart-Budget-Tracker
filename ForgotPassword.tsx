import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertCircle,
  CheckCircle2,
  Check,
  Copy,
  ShieldCheck,
  Clock,
  ArrowRight,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { validateEmail } from "../utils/emailValidator";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValidation = email ? validateEmail(email) : null;
  const isEmailFormatInvalid = Boolean(
    (emailTouched || email.includes("@")) && email && emailValidation && !emailValidation.isValid
  );
  const isEmailFormatValid = Boolean(email && emailValidation?.isValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    const val = validateEmail(email);
    if (!val.isValid) {
      setError(val.error || "Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error.message || "Failed to generate reset link.");
      } else {
        if (result.resetUrl) {
          setResetUrl(result.resetUrl);
        }
        setSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-lg shadow-emerald-900/20">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Reset Link Dispatched</h2>
          <p className="text-gray-400 text-sm">
            We generated a secure password reset link for:
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-600/40 text-blue-300 text-xs font-mono font-medium">
            <Mail size={13} className="text-blue-400" />
            {email}
          </div>
        </div>

        {/* Real-time interactive Link Simulation Hub */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/40 border border-blue-500/30 rounded-xl p-4.5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-blue-300 font-semibold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-blue-400" />
              Real-Time Reset Dispatch
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <Clock size={12} />
              Valid for 60 min
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            In live production, this secure link is sent to your email inbox. In this environment, you can open or copy your personalized reset link immediately:
          </p>

          <div className="space-y-2">
            {resetUrl && (
              <button
                type="button"
                onClick={() => {
                  try {
                    const url = new URL(resetUrl);
                    navigate(`${url.pathname}${url.search}`);
                  } catch {
                    navigate("/reset-password");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-blue-600/25 transition-all cursor-pointer text-sm group"
              >
                <span>Open Reset Password Page</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {resetUrl && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={resetUrl}
                  className="flex-1 bg-gray-950/80 border border-gray-700/80 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-400 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600/60 text-gray-200 text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
            <span>Single-use token</span>
            <span>End-to-end encrypted</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setResetUrl("");
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Try another email
          </button>

          <Link
            to="/login"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Reset password</h2>
        <p className="text-gray-400 mt-1">Enter your email and we will send a reset link</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 flex gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">Email Address</label>
            {isEmailFormatValid && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <Check size={12} /> Format is valid
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              autoComplete="email"
              value={email}
              onBlur={() => setEmailTouched(true)}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="name@gmail.com"
              className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors pr-10 ${
                isEmailFormatInvalid
                  ? "border-red-500/80 focus:border-red-500 bg-red-950/15 text-red-200"
                  : isEmailFormatValid
                  ? "border-emerald-500/70 focus:border-emerald-500 bg-emerald-950/10"
                  : "border-gray-700 focus:border-blue-500"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isEmailFormatInvalid && <AlertCircle size={17} className="text-red-400" />}
              {isEmailFormatValid && <CheckCircle2 size={17} className="text-emerald-400" />}
            </div>
          </div>

          {/* Validation Feedback Message */}
          {isEmailFormatInvalid && emailValidation?.error && (
            <div className="mt-1.5 space-y-1 animate-in fade-in">
              <p className="text-xs text-red-400 font-medium flex items-center gap-1">
                <AlertCircle size={13} className="shrink-0" />
                <span>{emailValidation.error}</span>
              </p>
              {emailValidation.suggestion && (
                <button
                  type="button"
                  onClick={() => setEmail(emailValidation.suggestion!)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer block text-left"
                >
                  Did you mean <strong>{emailValidation.suggestion}</strong>? Click to use.
                </button>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center">
        <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
          Back to login
        </Link>
      </p>
    </div>
  );
}
