import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, ArrowRight, LogOut, ShieldCheck, Eye, EyeOff, CheckCircle2, Check } from "lucide-react";
import { validateEmail } from "../utils/emailValidator";

function friendlyError(msg: string): string {
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed")) {
    return "Cannot connect to database. Checking local accounts...";
  }
  if (msg.includes("Invalid login") || msg.includes("invalid credentials") || msg.includes("Incorrect password")) {
    return "Incorrect email or password. Please verify and try again.";
  }
  if (msg.includes("No account found")) {
    return "No account found with this email. Please sign up first.";
  }
  if (msg.includes("Email not confirmed")) return "Please verify your email before signing in.";
  return msg;
}

export default function Login() {
  const { signIn, signInDemo, signOut, isAuthenticated, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  // Clean empty inputs so users sign in safely with their own credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValidation = email ? validateEmail(email) : null;
  const isEmailFormatInvalid = Boolean((emailTouched || email.includes("@")) && email && emailValidation && !emailValidation.isValid);
  const isEmailFormatValid = Boolean(email && emailValidation?.isValid);

  // If already authenticated, show the Already Signed In screen
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
            to={from}
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
            <span>Sign Out & Switch Account</span>
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
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(friendlyError(err.message));
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please check your credentials.");
    }
    setLoading(false);
  };

  const handleQuickDemo = () => {
    signInDemo("Malipeddi Tarun", "malipedditarun789@gmail.com");
    navigate(from, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-gray-400 mt-1">Sign in with your secure account</p>
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
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
          {loading ? "Signing in..." : "Sign In"}
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
        <span>⚡ Quick Sign In (Tarun Demo Account)</span>
      </button>

      <p className="text-center text-gray-400 text-sm">
        Don't have an account? <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium">Create one</Link>
      </p>
    </div>
  );
}