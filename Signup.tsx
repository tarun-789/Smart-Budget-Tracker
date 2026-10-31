import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, ArrowRight, LogOut, ShieldCheck, Eye, EyeOff, CheckCircle2, Check } from "lucide-react";
import { validateEmail } from "../utils/emailValidator";

function friendlyError(msg: string): string {
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
    return "Cannot connect to database. Please check your connection.";
  }
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (msg.includes("password") && msg.includes("weak")) return "Password is too weak. Use at least 6 characters.";
  if (msg.includes("invalid email")) return "Please enter a valid email address.";
  return msg;
}

export default function Signup() {
  const { signUp, signInDemo, signOut, isAuthenticated, user, profile } = useAuth();
  const navigate = useNavigate();

  // Clean empty inputs so ANY user can sign up
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValidation = email ? validateEmail(email) : null;
  const isEmailFormatInvalid = Boolean((emailTouched || email.includes("@")) && email && emailValidation && !emailValidation.isValid);
  const isEmailFormatValid = Boolean(email && emailValidation?.isValid);

  // If already authenticated, show Already Signed In screen!
  if (isAuthenticated && user) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-600/30 text-2xl font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Session
          </span>
          <h2 className="text-2xl font-extrabold text-white">Already Signed In</h2>
          <p className="text-gray-400 text-sm mt-1">
            You are currently signed in as <span className="text-white font-semibold">{profile?.full_name || "Active User"}</span> ({user.email}).
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={16} />
          </Link>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer border border-gray-700 flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            <span>Sign Out to Register Another Account</span>
          </button>
        </div>
      </div>
    );
  }

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
      const { error: err } = await signUp(email, password, name);
      if (err) {
        setError(friendlyError(err.message));
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    }
    setLoading(false);
  };

  const handleQuickDemo = () => {
    signInDemo("Malipeddi Tarun", "malipedditarun789@gmail.com");
    navigate("/dashboard");
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-8 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-green-900/40 border border-green-500/40 rounded-full flex items-center justify-center mx-auto text-2xl text-green-400 shadow-xl shadow-green-950/50">
          ✓
        </div>
        <h2 className="text-xl font-bold text-white">Welcome, {name || "User"}!</h2>
        <p className="text-gray-400 text-sm">Account created successfully. Loading your personal financial dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Create account</h2>
        <p className="text-gray-400 mt-1">Start understanding your money today</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 flex gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {/* Security Assurance Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-900/60 border border-gray-800 rounded-xl py-2 px-3">
        <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
        <span>End-to-End Encrypted & Zero-Knowledge Vault Protected</span>
      </div>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-950 px-2 text-gray-500">Instant Access</span></div>
      </div>

      <button
        type="button"
        onClick={handleQuickDemo}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-lg text-sm font-medium transition-all cursor-pointer"
      >
        <span>⚡ Explore Live Demo as Tarun</span>
      </button>

      <p className="text-center text-gray-400 text-sm">
        Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
      </p>
    </div>
  );
}