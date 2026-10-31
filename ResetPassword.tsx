import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Check,
  Mail,
} from "lucide-react";
import { verifyPasswordResetToken } from "../services/authRegistry";

interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Retrieve token & email from query params or hash
  const queryToken = searchParams.get("token") || "";
  const queryEmail = searchParams.get("email") || "";

  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState(queryEmail);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Validate token on mount
  useEffect(() => {
    // Check if token exists in query param
    if (queryToken) {
      const verification = verifyPasswordResetToken(queryToken);
      if (verification.valid) {
        setIsTokenValid(true);
        setToken(queryToken);
        if (verification.email) setEmail(verification.email);
      } else {
        setIsTokenValid(false);
        setTokenError(verification.error || "This reset link is invalid or has expired.");
      }
      return;
    }

    // Check if coming from Supabase hash fragment (e.g. #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      setIsTokenValid(true);
      return;
    }

    // If neither exists
    setIsTokenValid(false);
    setTokenError("Missing password reset token. Please request a reset link from the forgot password page.");
  }, [queryToken]);

  // Password requirements & strength
  const requirements: PasswordRequirement[] = useMemo(() => {
    return [
      { id: "length", label: "At least 8 characters", met: newPassword.length >= 8 },
      { id: "uppercase", label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
      { id: "lowercase", label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
      { id: "number", label: "At least one number (0-9)", met: /[0-9]/.test(newPassword) },
      { id: "special", label: "At least one special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const metCount = requirements.filter((r) => r.met).length;

  const strength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    if (metCount <= 2) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-400" };
    if (metCount === 3) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
    if (metCount === 4) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-400" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  }, [metCount, newPassword]);

  // Matching check
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isFormValid = newPassword.length >= 8 && passwordsMatch && metCount >= 3;

  // Auto-redirect countdown on success
  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError("");
    setLoading(true);

    try {
      const result = await updatePassword(newPassword, token, email);
      if (result.error) {
        setError(result.error.message || "Failed to update password. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS STATE
  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-xl shadow-emerald-950/40 animate-in zoom-in-95">
          <CheckCircle2 size={36} className="text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Password Reset Successful!</h2>
          <p className="text-gray-300 text-sm max-w-sm mx-auto leading-relaxed">
            Your password has been updated securely. You can now sign in with your new credentials.
          </p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin text-blue-400" />
          <span>Redirecting to Sign In in <strong className="text-white">{countdown}</strong> seconds...</span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Sign In with New Password</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // INVALID OR EXPIRED TOKEN STATE
  if (isTokenValid === false) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-xl shadow-red-950/30">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Invalid or Expired Link</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
            {tokenError}
          </p>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 space-y-2">
          <p className="font-medium text-gray-200 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-400" />
            Security Notice
          </p>
          <p className="text-gray-400 leading-relaxed">
            For account protection, password reset links are strictly single-use and expire after 60 minutes.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            to="/forgot-password"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer text-sm"
          >
            <span>Request New Reset Link</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/login"
            className="w-full block text-center text-xs text-gray-400 hover:text-gray-200 py-2 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // VALID TOKEN / SET PASSWORD FORM
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1.5">
          <KeyRound size={14} />
          Secure Password Reset
        </div>
        <h2 className="text-2xl font-bold text-white">Set New Password</h2>
        <p className="text-gray-400 text-sm mt-1">
          Create a strong password to secure your FinSight AI account
        </p>
      </div>

      {email && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 text-gray-300 text-xs font-medium">
          <Mail size={13} className="text-blue-400" />
          <span>Resetting password for: <strong className="text-white">{email}</strong></span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 flex gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NEW PASSWORD INPUT */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter new strong password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {/* PASSWORD STRENGTH BAR */}
          {newPassword && (
            <div className="mt-2 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Password Strength:</span>
                <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      step <= strength.score ? strength.color : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CONFIRM PASSWORD INPUT */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">
              Confirm New Password
            </label>
            {passwordsMatch && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <Check size={12} /> Passwords match
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Lock size={16} />
            </div>
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Confirm new password"
              className={`w-full bg-gray-800 border rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors text-sm ${
                passwordsMismatch
                  ? "border-red-500/80 focus:border-red-500 bg-red-950/10"
                  : passwordsMatch
                  ? "border-emerald-500/80 focus:border-emerald-500 bg-emerald-950/10"
                  : "border-gray-700 focus:border-blue-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1 animate-in fade-in">
              <AlertCircle size={12} /> Passwords do not match
            </p>
          )}
        </div>

        {/* REQUIREMENTS CHECKLIST */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3.5 space-y-2">
          <p className="text-xs font-semibold text-gray-300">Password Requirements:</p>
          <ul className="grid grid-cols-1 gap-1.5 text-xs">
            {requirements.map((req) => (
              <li
                key={req.id}
                className={`flex items-center gap-2 transition-colors ${
                  req.met ? "text-emerald-400 font-medium" : "text-gray-400"
                }`}
              >
                {req.met ? (
                  <Check size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-600 inline-block shrink-0" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <Link
          to="/login"
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel and return to Sign In
        </Link>
      </div>
    </div>
  );
}
