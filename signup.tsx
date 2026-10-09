
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

      if (signupError) throw signupError;

      if (data.session) {
        navigate("/dashboard", { replace: true });
      } else {
        setSuccess(
          "Account created. Check your email to confirm your account before signing in."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <Lock size={26} className="text-blue-400" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Create Account
          </h1>

          <p className="text-gray-400 mt-2 text-sm">
            Start managing your money with Smart Budget Tracker.
          </p>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Use at least 8 characters.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
              >
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600/10 to-blue-600/10 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-lg text-sm font-medium transition-all"
          >
            <span>⚡ Explore Live Demo</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-950/60 border border-gray-800 rounded-xl py-3 px-3 mt-5">
            <ShieldCheck
              size={16}
              className="text-emerald-400 shrink-0"
            />
            <span>Secure account authentication</span>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Smart Budget Tracker
        </p>
      </div>
    </main>
  );
}
