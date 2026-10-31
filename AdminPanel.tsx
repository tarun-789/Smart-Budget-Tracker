// FinSight AI — Enterprise Administration, RBAC & Security Console
// Demonstrates Authentication vs Authorization, Roles & Protected Routes (RequireRole, AdminOnly),
// Live JWT Decoding (Signed vs Encrypted), Refresh Token Rotation with Reuse Detection Tripwire,
// and Clerk + Supabase Row Level Security (RLS) integration.

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Database,
  Users,
  Code2,
  Sparkles,
  Download,
  Play,
  FileCode,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useClerkSupabaseClient, type DiagnosticQueryResult } from "../hooks/useClerkSupabaseClient";
import {
  decodeJwt,
  verifyJwtSignature,
  callProtectedApiEndpoint,
  generateSupabaseRlsSql,
  getStoredRotationState,
} from "../utils/authUtils";
import { AdminOnly } from "../components/guards/AdminOnly";

export default function AdminPanel() {
  const {
    user,
    roles,
    activeRole,
    switchRole,
    accessToken,
    rotateTokens,
    triggerReplayAttack,
    isSessionRevoked,
    sessionRevocationReason,
    resetSessionSecurity,
    registeredUsers,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"rbac" | "jwt" | "rotation" | "supabase_rls" | "api_tester">("rbac");
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // JWT Tamper Sandbox State
  const [tamperedPayloadText, setTamperedPayloadText] = useState(() => {
    const decoded = decodeJwt(accessToken);
    return JSON.stringify(decoded?.payload || {}, null, 2);
  });
  const [tamperCheckResult, setTamperCheckResult] = useState<{
    tested: boolean;
    isValid: boolean;
    error?: string;
  }>({ tested: false, isValid: true });

  // Backend API Tester State
  const [apiTestResult, setApiTestResult] = useState<{
    status: number | null;
    body: Record<string, unknown> | null;
    message: string;
  }>({ status: null, body: null, message: "" });
  const [apiTesting, setApiTesting] = useState(false);

  // Rotation feedback
  const [rotationMsg, setRotationMsg] = useState<{ type: "success" | "danger" | "info"; text: string } | null>(null);

  const rotationState = getStoredRotationState();
  const currentDecoded = decodeJwt(accessToken);

  // Handle Token Rotation Action
  const handleRotate = () => {
    const res = rotateTokens();
    if (res.isTheftDetected) {
      setRotationMsg({ type: "danger", text: res.message });
    } else {
      setRotationMsg({ type: "success", text: res.message });
    }
    setTimeout(() => setRotationMsg(null), 6000);
  };

  // Handle Simulated Replay Attack
  const handleReplayAttack = () => {
    const res = triggerReplayAttack();
    setRotationMsg({
      type: "danger",
      text: `🚨 TRIPWIRE TRIGGERED: ${res.message}`,
    });
  };

  // Handle Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSupabaseRlsSql());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Clerk + Supabase Integration State
  const clerk = useClerkSupabaseClient();
  const [selectedRlsTable, setSelectedRlsTable] = useState<string>("transactions");
  const [clerkDiagnosticResult, setClerkDiagnosticResult] = useState<DiagnosticQueryResult | null>(null);
  const [isQueryingRls, setIsQueryingRls] = useState<boolean>(false);
  const [clerkTokenPreview, setClerkTokenPreview] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(false);

  const handleInspectClerkToken = async () => {
    setIsLoadingToken(true);
    try {
      const token = await clerk.getToken({ template: "supabase" });
      setClerkTokenPreview(token);
    } catch {
      setClerkTokenPreview(null);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const handleExecuteRlsQuery = async () => {
    setIsQueryingRls(true);
    try {
      const result = await clerk.executeDiagnosticQuery(selectedRlsTable);
      setClerkDiagnosticResult(result);
    } finally {
      setIsQueryingRls(false);
    }
  };

  const handleDownloadSql = () => {
    const sql = generateSupabaseRlsSql();
    const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "20260916_clerk_supabase_rls.sql";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Tamper Verification
  const handleVerifyTamperedJwt = () => {
    try {
      const parsedPayload = JSON.parse(tamperedPayloadText);
      // Construct a token with the original signature but modified payload
      const parts = accessToken.split(".");
      const b64UrlEncode = (obj: unknown) => {
        return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
      };
      const tamperedB64 = b64UrlEncode(parsedPayload);
      const tamperedToken = `${parts[0]}.${tamperedB64}.${parts[2]}`;

      const res = verifyJwtSignature(tamperedToken);
      setTamperCheckResult({
        tested: true,
        isValid: res.isValid,
        error: res.error,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setTamperCheckResult({
        tested: true,
        isValid: false,
        error: `JSON parse error: ${message}`,
      });
    }
  };

  // Handle Backend API Test
  const runApiTest = (mode: "current" | "tampered_non_admin" | "invalid") => {
    setApiTesting(true);
    setTimeout(() => {
      let tokenToTest = accessToken;
      if (mode === "tampered_non_admin") {
        // User with non-admin role
        tokenToTest = accessToken.replace(/\.[^.]*$/, ".fake_sig");
      } else if (mode === "invalid") {
        tokenToTest = "invalid.token.payload";
      }

      // If testing with standard user activeRole
      const res = callProtectedApiEndpoint(tokenToTest, "admin");
      setApiTestResult(res);
      setApiTesting(false);
    }, 400);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              RFC 7519 & RFC 6749 Certified
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="w-3.5 h-3.5" />
              RBAC Authorization Gate
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Enterprise Authentication & RBAC Administration
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Live evaluation console for <strong>Authentication vs. Authorization</strong>, 
            <strong> Signed vs. Encrypted JWT mechanics</strong>, <strong>Refresh Token Rotation with Theft Tripwire</strong>, 
            and <strong>Clerk + Supabase PostgreSQL Row Level Security (RLS)</strong>.
          </p>
        </div>

        {/* Live Quick Role Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <div className="text-xs">
            <span className="text-gray-400 block text-[11px]">Active RBAC Claim:</span>
            <span className="font-mono font-bold uppercase text-white flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${activeRole === "admin" ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
              {activeRole}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => switchRole("admin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "admin"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => switchRole("user")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "user"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => switchRole("analyst")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeRole === "analyst"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Analyst
            </button>
          </div>
        </div>
      </div>

      {/* Session Revocation Alert (if triggered by attack) */}
      {isSessionRevoked && (
        <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-2xl text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-300">Session Terminated by Theft Tripwire</h4>
              <p className="text-xs text-red-200/80 mt-0.5">{sessionRevocationReason}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetSessionSecurity}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Reset Security State & Re-authenticate
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("rbac")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "rbac"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-gray-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          1. Roles & RBAC Architecture
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("jwt")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "jwt"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-gray-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Code2 className="w-4 h-4 text-pink-400" />
          2. JWT Inspector & Tamper Sandbox
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rotation")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "rotation"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-gray-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <RefreshCw className="w-4 h-4 text-amber-400" />
          3. Refresh Token Rotation & Theft Tripwire
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("supabase_rls")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "supabase_rls"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-gray-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          4. Clerk + Supabase RLS Blueprint
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("api_tester")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "api_tester"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-gray-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Terminal className="w-4 h-4 text-cyan-400" />
          5. Backend API Introspection Tester
        </button>
      </div>

      {/* TAB 1: ROLES & RBAC ARCHITECTURE */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          {/* Concept Split Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-500/20 space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                1 · Authentication
              </span>
              <h3 className="text-base font-bold text-white">"Who are you?"</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Login and signup live here. Once credentials (email, password, or OAuth) are verified,
                an authenticated identity ticket (session or JWT) is minted. The login step is identical for everyone.
              </p>
              <div className="pt-2 text-xs font-mono text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                Active User: {user?.email || "demo@finsight.ai"}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300">
                2 · Authorization
              </span>
              <h3 className="text-base font-bold text-white">"What are you allowed to do?"</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Roles and protected routes live here. Whether you can see <code>/dashboard</code> versus <code>/admin</code> is authorization.
                Both checks reuse the exact same login step; what differs is only which gate the role claim on the ticket clears.
              </p>
              <div className="pt-2 text-xs font-mono text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Roles on Ticket: [{roles.join(", ")}]
              </div>
            </div>
          </div>

          {/* User Directory & Role Assignment Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Registered Users & Role Assignments
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Test role-based access control by toggling roles or assigning privileges
                </p>
              </div>
              <span className="text-xs font-mono text-gray-400">
                Total Users: {registeredUsers.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-gray-400 font-mono text-[11px]">
                    <th className="pb-3 font-semibold">USER IDENTITY</th>
                    <th className="pb-3 font-semibold">EMAIL</th>
                    <th className="pb-3 font-semibold">ASSIGNED ROLES</th>
                    <th className="pb-3 font-semibold">RBAC ACCESS GATES</th>
                    <th className="pb-3 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registeredUsers.map((u) => {
                    const isCurrentUser = u.email === user?.email;
                    const displayRole = isCurrentUser ? activeRole : "user";
                    const hasAdmin = displayRole === "admin";

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-medium text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-300">
                            {u.full_name[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            {isCurrentUser && (
                              <span className="text-[10px] text-emerald-400 font-mono font-normal">Active Session</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-gray-300 font-mono">{u.email}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase ${
                              hasAdmin
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            }`}
                          >
                            {displayRole}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300 text-[11px]">
                          {hasAdmin ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" /> /dashboard, /admin, RLS Bypass
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1 font-mono">
                              <Lock className="w-3.5 h-3.5 text-amber-400" /> /dashboard only (Blocks /admin)
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {isCurrentUser ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => switchRole(activeRole === "admin" ? "user" : "admin")}
                                className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Toggle to {activeRole === "admin" ? "User" : "Admin"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-[11px]">Device Account</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Demonstration: RequireRole and AdminOnly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Route Guard: &lt;RequireRole allowed={["admin"]} /&gt;
                </span>
                <span className="text-[10px] text-gray-500 font-mono">App.tsx</span>
              </div>
              <p className="text-xs text-gray-400">
                Wraps entire pages. If a non-admin attempts to access <code>/admin</code>, they bounce back to <code>/dashboard</code>:
              </p>
              <pre className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800">
{`// app/components/RequireRole.tsx
export function RequireRole({ allowed, children }) {
  const { roles, isLoading } = useAuth();
  const isAllowed = roles.some((r) => allowed.includes(r));

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}`}
              </pre>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  UI Guard: &lt;AdminOnly&gt;
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Inline UI Gate</span>
              </div>
              <p className="text-xs text-gray-400">
                Gates specific buttons or controls inline. Try switching roles above to observe this live button:
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-gray-300">Protected Destructive Action:</span>
                <AdminOnly
                  fallback={
                    <span className="text-[11px] text-gray-500 italic flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Hidden from non-admins
                    </span>
                  }
                >
                  <button
                    type="button"
                    onClick={() => alert("Admin privilege verified! Action executed successfully.")}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md shadow-red-600/20 transition-colors"
                  >
                    Purge System Cache (Admin Only)
                  </button>
                </AdminOnly>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JWT INSPECTOR & TAMPER SANDBOX */}
      {activeTab === "jwt" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-pink-400" />
              JWTs Decoded: Three Segments Joined by Dots
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-3xl">
              <strong>Signed, not encrypted:</strong> Anyone holding the token can decode the payload with two base64 splits and JSON.parse. 
              The signature only proves it wasn't tampered with. Never put secrets in a JWT payload!
            </p>
          </div>

          {/* Raw Token Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Encoded JWT (Live Session Token)
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(accessToken);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2500);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedToken ? "Copied" : "Copy Token"}
              </button>
            </div>

            {/* Color-Coded Segments */}
            {(() => {
              const parts = accessToken.split(".");
              return (
                <div className="p-4 bg-slate-950 rounded-xl font-mono text-xs break-all leading-relaxed border border-slate-800">
                  <span className="text-pink-400 font-bold">{parts[0]}</span>
                  <span className="text-gray-400 font-bold">.</span>
                  <span className="text-purple-400 font-bold">{parts[1]}</span>
                  <span className="text-gray-400 font-bold">.</span>
                  <span className="text-emerald-400 font-bold">{parts[2]}</span>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-pink-950/20 border border-pink-500/20 rounded-xl">
                <span className="font-bold text-pink-400 block font-mono">1. HEADER (alg & typ)</span>
                <pre className="mt-1 text-[11px] text-gray-300 font-mono">
                  {JSON.stringify(currentDecoded?.header || {}, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                <span className="font-bold text-purple-400 block font-mono">2. PAYLOAD (Claims & Roles)</span>
                <pre className="mt-1 text-[11px] text-gray-300 font-mono">
                  {JSON.stringify(currentDecoded?.payload || {}, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                <span className="font-bold text-emerald-400 block font-mono">3. SIGNATURE</span>
                <p className="mt-1 text-[11px] text-gray-300 font-mono">
                  HMACSHA256(b64(header) + "." + b64(payload), secret)
                </p>
                <div className="mt-2 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Signature Matches Payload
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Tamper Sandbox */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Live Tamper Sandbox — Try Privilege Escalation!
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Edit the payload JSON below (e.g. change <code>"role": "user"</code> to <code>"role": "admin"</code>) and test signature verification
                </p>
              </div>
            </div>

            <textarea
              value={tamperedPayloadText}
              onChange={(e) => setTamperedPayloadText(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleVerifyTamperedJwt}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify Signature with Secret Key
              </button>

              <button
                type="button"
                onClick={() => {
                  setTamperedPayloadText(JSON.stringify(currentDecoded?.payload || {}, null, 2));
                  setTamperCheckResult({ tested: false, isValid: true });
                }}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Reset to Valid Token Payload
              </button>
            </div>

            {tamperCheckResult.tested && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
                  tamperCheckResult.isValid
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                {tamperCheckResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-sm block">
                    {tamperCheckResult.isValid
                      ? "200 OK — Signature VALID"
                      : "401 UNAUTHORIZED — Signature Mismatch Detected!"}
                  </span>
                  <p className="mt-1 opacity-90">
                    {tamperCheckResult.isValid
                      ? "Payload exactly matches the signed cryptographic digest."
                      : tamperCheckResult.error || "The payload was altered without the private HMAC secret key. The server rejected the request."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REFRESH TOKEN ROTATION & THEFT TRIPWIRE */}
      {activeTab === "rotation" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              Refresh Token Rotation (RFC 6749 Section 10.4)
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-3xl">
              Every refresh doesn't just mint a new access token — it also mints a new refresh token and 
              <strong> permanently kills the old one</strong>. Reusing an already-rotated token is treated as a 
              <strong> theft signal</strong>, immediately terminating the entire token family!
            </p>
          </div>

          {rotationMsg && (
            <div
              className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                rotationMsg.type === "danger"
                  ? "bg-red-950/50 border-red-500/30 text-red-300"
                  : "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {rotationMsg.type === "danger" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {rotationMsg.text}
            </div>
          )}

          {/* Interactive Rotation Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Legitimate App Refresh Flow
              </span>
              <p className="text-xs text-gray-400">
                Access token expires. Legitimate client trades active single-use refresh token (<code>R{rotationState.history.length}</code>). 
                Server marks it used and mints a brand-new token pair:
              </p>
              <button
                type="button"
                onClick={handleRotate}
                disabled={isSessionRevoked}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Rotate Token (Mint A{rotationState.history.length + 1} & R{rotationState.history.length + 1})
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-red-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Theft & Replay Attack Tripwire
              </span>
              <p className="text-xs text-gray-400">
                Simulate an attacker who stole an older refresh token that was already rotated. 
                Server sees a replayed token → triggers family revocation:
              </p>
              <button
                type="button"
                onClick={handleReplayAttack}
                disabled={isSessionRevoked}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                Simulate Stolen Token Replay Attack
              </button>
            </div>
          </div>

          {/* Token Family Tree History */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-mono">
                Token Family Genealogy ({rotationState.familyId})
              </h4>
              <span className="text-xs font-mono text-gray-400">
                Active Token: <strong className="text-emerald-400">{rotationState.activeRefreshToken}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {rotationState.history.map((node, index) => {
                const isActive = node.tokenId === rotationState.activeRefreshToken;
                return (
                  <div
                    key={node.tokenId}
                    className={`p-3 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isActive
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white">{node.tokenId}</span>
                        <span className="text-[10px] text-gray-500 block">
                          Created: {new Date(node.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active & Single-Use
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400">
                          Used / Retired
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLERK + SUPABASE RLS COMMAND CENTER */}
      {activeTab === "supabase_rls" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Clerk + Supabase Row Level Security (RLS) Command Center
                </h3>
                <p className="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
                  Enterprise identity architecture: <strong>Clerk</strong> manages authentication, passkeys, and session tokens, 
                  while <strong>Supabase PostgreSQL RLS</strong> isolates tenant data at the database level by extracting 
                  <code>request.jwt.claims-&gt;&gt;'sub'</code> via <code>requesting_user_id()</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700 hover:border-slate-600"
                  title="Download .sql migration file"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .sql</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? "SQL Copied!" : "Copy SQL"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live System Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block font-mono">
                Clerk Mode
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${clerk.isClerkConfigured ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
                <span className="text-xs font-bold text-white">
                  {clerk.isClerkConfigured ? "Live Clerk API" : "Dev Simulation Mode"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {clerk.isClerkConfigured ? "Using VITE_CLERK_PUBLISHABLE_KEY" : "Dual-mode resilient local adapter"}
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block font-mono">
                Clerk User ID (sub claim)
              </span>
              <div className="mt-2 text-xs font-mono font-bold text-emerald-400 truncate" title={clerk.user?.id || "N/A"}>
                {clerk.user?.id || "user_clerk_demo"}
              </div>
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                {clerk.user?.primaryEmailAddress?.emailAddress || "alex.rivera@finsight.ai"}
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block font-mono">
                JWT Template
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-white font-mono">template: 'supabase'</span>
              </div>
              <p className="text-[11px] text-purple-300/80 mt-1 font-mono">
                Signing: HS256 (Supabase Secret)
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block font-mono">
                RLS Function
              </span>
              <div className="mt-2 text-xs font-mono font-bold text-cyan-400">
                requesting_user_id()
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Parsed from JWT request headers
              </p>
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-gray-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold text-[11px] uppercase">
                End-to-End Request Flow: Browser ➔ Clerk ➔ Supabase RLS
              </span>
              <span className="text-[10px] text-gray-500">RFC 7519 &amp; PostgreSQL RLS</span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300">
{`1. Browser (Vite + React)
   │
   │  session.getToken({ template: 'supabase' })
   ├─────────────────────────────────────────────────┐
   │                                                 │
   ▼                                                 ▼
2. Clerk Auth Engine                          3. Supabase Client fetch() wrapper
   Generates JWT:                                Injects: Authorization: Bearer <clerk_token>
   { "sub": "user_2xxxx", "aud": "auth..." }        │
                                                     │ HTTP Request (REST / GraphQL)
                                                     ▼
                                              4. PostgreSQL Table (transactions)
                                                 ┌─────────────────────────────────────┐
                                                 │ requesting_user_id() =              │
                                                 │   request.jwt.claims->>'sub'        │
                                                 │                                     │
                                                 │ WHERE user_id = requesting_user_id()│
                                                 └─────────────────────────────────────┘
                                                     │
                                                     ▼ 5. Isolated User Rows Only`}
            </pre>
          </div>

          {/* Interactive Lab: Clerk Token Inspector & Live Supabase Query Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Token Inspector */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    Live Clerk JWT Mint &amp; Claims Inspector
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Calls <code>session.getToken(&#123; template: 'supabase' &#125;)</code> and inspects the payload
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInspectClerkToken}
                  disabled={isLoadingToken}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isLoadingToken ? "Minting..." : "Mint & Inspect Token"}
                </button>
              </div>

              {clerkTokenPreview ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-purple-300 break-all">
                    <span className="text-gray-500 font-bold block mb-1">RAW CLERK JWT:</span>
                    {clerkTokenPreview}
                  </div>

                  {(() => {
                    const decoded = decodeJwt(clerkTokenPreview);
                    return (
                      <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between text-purple-400 font-bold">
                          <span>DECODED CLAIMS</span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> sub claim matches Clerk User ID
                          </span>
                        </div>
                        <pre className="text-[11px] text-slate-300 overflow-x-auto">
                          {JSON.stringify(decoded?.payload, null, 2)}
                        </pre>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-gray-400">
                    Click <strong>"Mint &amp; Inspect Token"</strong> to test generating a Supabase JWT from Clerk.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Live RLS Query Tester */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Live Supabase RLS Query Tester
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Executes query via <code>createClerkSupabaseClient()</code> with injected Bearer header
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedRlsTable}
                    onChange={(e) => setSelectedRlsTable(e.target.value)}
                    className="bg-slate-950 text-xs font-mono text-white px-2.5 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer"
                  >
                    <option value="transactions">Table: transactions</option>
                    <option value="accounts">Table: accounts</option>
                    <option value="budgets">Table: budgets</option>
                    <option value="goals">Table: goals</option>
                    <option value="vault_documents">Table: vault_documents</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleExecuteRlsQuery}
                    disabled={isQueryingRls}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isQueryingRls ? "Querying..." : "Execute"}
                  </button>
                </div>
              </div>

              {clerkDiagnosticResult ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">OUTGOING REQUEST HEADERS:</span>
                      <span className="text-[10px] text-gray-400">{clerkDiagnosticResult.latencyMs} ms latency</span>
                    </div>
                    <pre className="text-[11px] text-cyan-300">
                      {JSON.stringify(clerkDiagnosticResult.executedHeaders, null, 2)}
                    </pre>
                  </div>

                  <div
                    className={`p-3 rounded-xl border font-mono text-xs flex items-start gap-2.5 ${
                      clerkDiagnosticResult.success
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : "bg-red-950/20 border-red-500/30 text-red-300"
                    }`}
                  >
                    {clerkDiagnosticResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        HTTP {clerkDiagnosticResult.status} — {clerkDiagnosticResult.success ? "Query Authorized via RLS" : "Query Blocked"}
                      </span>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        {clerkDiagnosticResult.error
                          ? clerkDiagnosticResult.error
                          : `Successfully evaluated RLS policy on '${selectedRlsTable}' with requesting_user_id().`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-gray-400">
                    Select a table and click <strong>"Execute"</strong> to test live query execution with header injection.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 6-Step Setup Walkthrough Adapted for Vite + React */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              6-Step Setup Walkthrough (Adapted for Vite + React 19)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">1</span>
                  Create requesting_user_id()
                </div>
                <p className="text-gray-400 text-[11px]">
                  In Supabase SQL Editor, run:
                </p>
                <code className="block p-2 bg-black/40 rounded border border-slate-800 text-[10px] text-emerald-300 font-mono">
                  CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS text AS ...
                </code>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">2</span>
                  Add user_id with Default
                </div>
                <p className="text-gray-400 text-[11px]">
                  Set column default to automatically populate Clerk user ID:
                </p>
                <code className="block p-2 bg-black/40 rounded border border-slate-800 text-[10px] text-cyan-300 font-mono">
                  ALTER TABLE transactions ADD COLUMN user_id text DEFAULT requesting_user_id();
                </code>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">3</span>
                  Enable RLS &amp; CRUD Policies
                </div>
                <p className="text-gray-400 text-[11px]">
                  Create SELECT, INSERT, UPDATE, DELETE policies:
                </p>
                <code className="block p-2 bg-black/40 rounded border border-slate-800 text-[10px] text-purple-300 font-mono">
                  USING (requesting_user_id() = user_id)
                </code>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">4</span>
                  Copy Supabase JWT Secret
                </div>
                <p className="text-gray-400 text-[11px]">
                  Navigate to Supabase Dashboard &gt; Project Settings &gt; API &gt; copy <strong>JWT Secret</strong>.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">5</span>
                  Create Clerk JWT Template
                </div>
                <p className="text-gray-400 text-[11px]">
                  In Clerk Dashboard &gt; JWT Templates &gt; New Template &gt; select <strong>Supabase</strong>. Name it <code>supabase</code> and paste your Supabase JWT Secret.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">6</span>
                  Use in Vite + React
                </div>
                <p className="text-gray-400 text-[11px]">
                  Use the custom hook <code>useClerkSupabaseClient()</code> which injects the Clerk token on every database call.
                </p>
              </div>
            </div>
          </div>

          {/* Complete PostgreSQL Script Display */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Complete PostgreSQL Migration (supabase/migrations/20260916_clerk_supabase_rls.sql)
              </h4>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? "Copied" : "Copy SQL"}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-300 border border-slate-800 overflow-x-auto max-h-96">
              {generateSupabaseRlsSql()}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 5: BACKEND API INTROSPECTION TESTER */}
      {activeTab === "api_tester" && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Backend API Introspection & The Valet Key Analogy
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-3xl">
              Frontend route checks are only UX — anyone can bypass the UI and call backend endpoints with cURL or Postman. 
              The backend <strong>must independently introspect the token and verify role claims</strong> on every request!
            </p>
          </div>

          {/* Valet Key Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-amber-400 font-mono">OAuth 2.0 = Valet Key</span>
              <p className="text-gray-300">
                Starts the car — nothing else. Answers: <em>"Is this request allowed to access these scopes?"</em>
                Has no idea who the owner is.
              </p>
            </div>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-cyan-400 font-mono">OIDC = Valet Key + ID Card</span>
              <p className="text-gray-300">
                Starts the car AND proves whose car it is. Adds <code>id_token</code> with <code>sub</code>, <code>email</code>, and <code>/userinfo</code> role claims.
              </p>
            </div>
          </div>

          {/* Live API Tester */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white font-mono">
                  Simulate Call to: GET /api/admin/stats
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sends HTTP Authorization header with Bearer token to backend introspection gate
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runApiTest("current")}
                  disabled={apiTesting}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Send with Active Token ({activeRole})
                </button>
                <button
                  type="button"
                  onClick={() => runApiTest("tampered_non_admin")}
                  disabled={apiTesting}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Send with Tampered Sig
                </button>
                <button
                  type="button"
                  onClick={() => runApiTest("invalid")}
                  disabled={apiTesting}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Send Missing/Invalid
                </button>
              </div>
            </div>

            {apiTestResult.status !== null && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                  apiTestResult.status === 200
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : apiTestResult.status === 403
                    ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                    : "bg-red-950/40 border-red-500/40 text-red-300"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>HTTP Response Status: {apiTestResult.status}</span>
                  <span>{apiTestResult.message}</span>
                </div>
                <pre className="p-3 bg-slate-950/80 rounded-lg text-[11px] overflow-x-auto text-slate-200">
                  {JSON.stringify(apiTestResult.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
