
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Check,
  Mail,
  Lock,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { validateEmail } from "../utils/emailValidator";

function friendlyError(message: string): string {
  const msg = message.toLowerCase();

  if (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("failed")
  ) {
    return "Cannot connect to the server. Check your internet connection and try again.";
  }

  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("incorrect password")
  ) {
    return "Incorrect email or password. Please verify and try again.";
  }

  if (msg.includes("no account found")) {
    return "No account found with this email. Please sign up first.";
  }

  if (msg.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (msg.includes("too many requests")) {
    return "Too many attempts. Please wait and try again.";
  }

  return message || "Something went wrong. Please try again.";
}

export default function Login() {
  const {
    signIn,
    signInDemo,
    signOut,
    isAuthenticated,
    user,
    profile,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname: string } } | null)
      ?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValidation = email.trim()
    ? validateEmail(email.trim())
    : null;

  const isEmailFormatInvalid = Boolean(
    emailTouched &&
      email.trim() &&
      emailValidation &&
      !emailValidation.isValid
  );

  const isEmailFormatValid = Boolean(
    email.trim() && emailValidation?.isValid
  );

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setEmailTouched(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailValidation?.isValid) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(normalizedEmail, password);

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error
      ) {
        const authError = result.error as {
          message?: string;
        };

        throw new Error(
          authError.message || "Unable to sign in."
        );
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error
            ? err.message
            : "Unable to sign in. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError("");
    setLoading(true);

    try {
      if (typeof signInDemo !== "function") {
        throw new Error(
          "Demo login is not available in AuthContext."
        );
      }

      const result = await signInDemo();

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error
      ) {
        const authError = result.error as {
          message?: string;
        };

        throw new Error(
          authError.message || "Unable to start demo mode."
        );
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error
            ? err.message
            : "Unable to open demo mode."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError("");
    setLoading(true);

    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error
            ? err.message
            : "Unable to sign out."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Already authenticated
  if (isAuthenticated && user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-600/30 text-2xl font-bold">
            {profile?.full_name?.charAt(0).toUpperCase() ||
              user.email?.charAt(0).toUpperCase() ||
              "U"}
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Session
            </span>

            <h1 className="text-2xl font-bold">
              Already Signed In
            </h1>

            <p className="text-gray-400 mt-2">
              Signed in as{" "}
              {profile?.full_name || user.email || "User"}.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 text-left"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate(from, { replace: true })}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 font-semibold py-3 rounded-lg transition-colors"
          >
            Continue to Dashboard
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            {loading ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <Lock size={26} className="text-blue-400" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Welcome Back
          </h1>

          <p className="text-gray-400 mt-2 text-sm">
            Sign in to your Smart Budget Tracker.
          </p>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  aria-invalid={isEmailFormatInvalid}
                  className={`w-full bg-gray-950 border rounded-lg pl-10 pr-11 py-3 text-white placeholder-gray-500 outline-none focus:ring-1 disabled:opacity-50 ${
                    isEmailFormatInvalid
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : isEmailFormatValid
                        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
                        : "border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />

                {isEmailFormatInvalid && (
                  <AlertCircle
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
                  />
                )}

                {isEmailFormatValid && (
                  <Check
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
                  />
                )}
              </div>

              {isEmailFormatInvalid && (
                <p className="text-xs text-red-400 mt-2">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            {/* Password */}
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
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <div className="text-right mt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600/10 to-blue-600/10 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
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
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Create Account
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
