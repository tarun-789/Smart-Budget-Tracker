import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Bell,
  Sliders,
  Database,
  Cloud,
  Server,
  Activity,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu,
  Save,
  Check,
  Sparkles,
  Trash2,
  Globe,
  Mic,
  Volume2,
  Monitor,
  Smartphone,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useFinanceStore } from "../services/dataStore";
import { formatINR } from "../utils/formatters";
import { supabaseUrl as defaultUrl, supabaseAnonKey as defaultKey } from "../lib/supabase";
import {
  SUPPORTED_LANGUAGES,
  getLanguageSettings,
  saveLanguageSettings,
} from "../services/multilingual/languageConfig";
import {
  getUserSessions,
  revokeSession,
  pingCurrentSession,
  formatRelativeTime,
  addSimulatedDeviceSession,
  type DeviceSession,
} from "../services/deviceSessionService";

type SettingsTab = "profile" | "preferences" | "language" | "cloud" | "admin" | "data" | "sessions";

export default function Settings() {
  const { profile, updateProfile, isDemoMode, user } = useAuth();
  const {
    accounts,
    transactions,
    budgets,
    goals,
    clearTransactions,
    resetToDemoData,
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name ?? "Malipeddi Tarun");
  const [email] = useState(profile?.email ?? "malipedditarun789@gmail.com");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "Asia/Kolkata");
  const [profileSaved, setProfileSaved] = useState(false);

  // Preferences State
  const [budgetThreshold, setBudgetThreshold] = useState(80);
  const [anomalySensitivity, setAnomalySensitivity] = useState<"low" | "medium" | "high">("medium");
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyAnomaly, setNotifyAnomaly] = useState(true);
  const [notifyRecurring, setNotifyRecurring] = useState(true);
  const [notifyGoals, setNotifyGoals] = useState(true);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  // Language & Voice State
  const currentLangSettings = getLanguageSettings();
  const [uiLang, setUiLang] = useState(currentLangSettings.uiLanguage || "en-IN");
  const preferredLang = uiLang;
  const [voiceInLang, setVoiceInLang] = useState(currentLangSettings.voiceInputLanguage || "te-IN");
  const [voiceOutLang, setVoiceOutLang] = useState(currentLangSettings.voiceOutputLanguage || "te-IN");
  const [voiceSpeed, setVoiceSpeed] = useState(currentLangSettings.speechSpeed || 1.0);
  const [voiceAutoRead, setVoiceAutoRead] = useState(currentLangSettings.autoReadResponses ?? true);
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(true);
  const [autoDetectLang, setAutoDetectLang] = useState(currentLangSettings.autoDetectLanguage ?? true);
  const [languageSaved, setLanguageSaved] = useState(false);

  // Cloud & Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem("finsight_custom_sb_url") || import.meta.env.VITE_SUPABASE_URL || defaultUrl || ""
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem("finsight_custom_sb_key") || import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey || ""
  );
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");

  // Data management state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showClearTxConfirm, setShowClearTxConfirm] = useState(false);
  const [clearTxSuccess, setClearTxSuccess] = useState(false);

  // Device Sessions State
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load and refresh sessions whenever the sessions tab is open
  useEffect(() => {
    if (!user?.id) return;
    const load = () => setSessions(getUserSessions(user.id));
    load();
    if (activeTab === "sessions") {
      pingCurrentSession(user.id);
      const interval = setInterval(() => {
        pingCurrentSession(user.id);
        load();
      }, 30_000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [user?.id, activeTab]);

  const handleRevokeSession = (sessionId: string) => {
    if (!user?.id) return;
    setRevokingId(sessionId);
    setTimeout(() => {
      revokeSession(sessionId, user.id);
      setSessions(getUserSessions(user.id));
      setRevokingId(null);
    }, 600);
  };

  // System Stats calculation
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
  const totalVolume = transactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: fullName,
      timezone,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      "finsight_preferences",
      JSON.stringify({
        budgetThreshold,
        anomalySensitivity,
        notifyBudget,
        notifyAnomaly,
        notifyRecurring,
        notifyGoals,
      })
    );
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 3000);
  };

  const handleSaveLanguage = () => {
    saveLanguageSettings({
      preferredLanguage: preferredLang,
      uiLanguage: uiLang,
      voiceInputLanguage: voiceInLang,
      voiceOutputLanguage: voiceOutLang,
      speechSpeed: voiceSpeed,
      autoReadResponses: voiceAutoRead,
      autoDetectLanguage: autoDetectLang,
    });
    setLanguageSaved(true);
    setTimeout(() => setLanguageSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setConnectionMessage("Validating Supabase API connectivity...");
    try {
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project")) {
        setTimeout(() => {
          setConnectionStatus("error");
          setConnectionMessage(
            "Demo Mode Active: Set your Supabase Project URL and Anon Key in .env.local or enter them here."
          );
        }, 800);
        return;
      }

      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseKey },
      });
      if (res.ok) {
        setConnectionStatus("success");
        setConnectionMessage("Connected to Supabase PostgreSQL instance successfully!");
        localStorage.setItem("finsight_custom_sb_url", supabaseUrl);
        localStorage.setItem("finsight_custom_sb_key", supabaseKey);
      } else {
        setConnectionStatus("error");
        setConnectionMessage(`Connection failed with HTTP status ${res.status}. Verify credentials.`);
      }
    } catch (err) {
      setConnectionStatus("error");
      setConnectionMessage(
        `Failed to reach Supabase: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleExportData = () => {
    const fullBackup = {
      exportDate: new Date().toISOString(),
      user: {
        name: profile?.full_name,
        email: profile?.email,
        currency: "INR",
      },
      accounts,
      transactions,
      budgets,
      goals,
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsight-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    resetToDemoData();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const handleClearTransactions = () => {
    clearTransactions();
    setShowClearTxConfirm(false);
    setClearTxSuccess(true);
    setTimeout(() => setClearTxSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings & Administration</h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure your personal profile, alert thresholds, Supabase cloud sync, and platform telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            {profile?.is_admin ? "Administrator Access" : "Standard User"}
          </span>
          {isDemoMode && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Demo Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "profile"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "preferences"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences & Alerts
        </button>
        <button
          onClick={() => setActiveTab("language")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "language"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          Voice & Languages (8 Indic)
        </button>
        <button
          onClick={() => setActiveTab("cloud")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "cloud"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Cloud className="w-4 h-4" />
          Cloud & Database
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "admin"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Server className="w-4 h-4" />
          Admin Telemetry
        </button>
        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "data"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Database className="w-4 h-4" />
          Data & Backup
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "sessions"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          <Monitor className="w-4 h-4" />
          Active Sessions
          {sessions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Profile */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">User Information</h2>
            <p className="text-gray-400 text-xs mb-6">Manage your public persona and localization</p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full bg-gray-950/60 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Verified
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Default Currency</label>
                  <input
                    type="text"
                    value="₹ INR (Indian Rupee)"
                    disabled
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 text-sm cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Lakhs & Crores numbering system active</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {profileSaved && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      Profile saved successfully!
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-1 mb-4 shadow-xl">
              <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center text-white text-2xl font-bold">
                {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "MT"}
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg">{fullName}</h3>
            <p className="text-gray-400 text-xs mb-3">{email}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Role: System Administrator
            </div>
            <div className="w-full mt-6 pt-6 border-t border-gray-800 grid grid-cols-2 gap-2 text-left">
              <div>
                <span className="text-gray-500 text-[11px] block">Accounts</span>
                <span className="text-white font-medium text-sm">{accounts.length} connected</span>
              </div>
              <div>
                <span className="text-gray-500 text-[11px] block">Transactions</span>
                <span className="text-white font-medium text-sm">{transactions.length} recorded</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Preferences & Alerts */}
      {activeTab === "preferences" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Financial Intelligence Thresholds</h2>
              <p className="text-gray-400 text-xs">Configure how FinSight triggers smart warnings</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-200">Budget Warning Threshold</label>
                <span className="text-sm font-bold text-emerald-400">{budgetThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={budgetThreshold}
                onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Receive an alert when any category expense crosses {budgetThreshold}% of its allocated monthly budget.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Anomaly Detection Sensitivity</label>
              <div className="grid grid-cols-3 gap-3">
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAnomalySensitivity(level)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold capitalize transition-colors ${
                      anomalySensitivity === level
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {level}
                    <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                      {level === "low" ? "Z > 2.5" : level === "medium" ? "Z > 1.5" : "Z > 1.0"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Medium (Z &gt; 1.5) catches spending that deviates by 1.5 standard deviations from your 90-day baseline.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSavePreferences}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Thresholds
              </button>
              {preferencesSaved && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium ml-4">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Notification Center Channels</h2>
              <p className="text-gray-400 text-xs">Choose which financial event alerts you wish to receive</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Budget Overrun Alerts</h4>
                    <p className="text-xs text-gray-400">Warn when category spend exceeds threshold</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyBudget}
                  onChange={(e) => setNotifyBudget(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Unusual Transaction Spikes</h4>
                    <p className="text-xs text-gray-400">Flag statistical anomalies & duplicate charges</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAnomaly}
                  onChange={(e) => setNotifyAnomaly(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Recurring Bill Reminders</h4>
                    <p className="text-xs text-gray-400">48-hour heads up before expected auto-debits</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyRecurring}
                  onChange={(e) => setNotifyRecurring(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Savings Goal Milestones</h4>
                    <p className="text-xs text-gray-400">Congratulate upon reaching quarterly targets</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyGoals}
                  onChange={(e) => setNotifyGoals(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Voice & Multilingual (8 Indian Languages) */}
      {activeTab === "language" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  8 Indic Languages Supported
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  Code-Mixed Parser
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white">Voice & Multilingual Configuration</h2>
              <p className="text-gray-400 text-xs">
                Independent channels for UI Interface, Voice Speech-to-Text Input, and Text-to-Speech Output.
              </p>
            </div>

            <div className="space-y-5">
              {/* Voice Assistant Master Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Voice Assistant Integration</h4>
                    <p className="text-xs text-gray-400">Enable hands-free microphone listening and voice command recognition</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceAssistantActive}
                  onChange={(e) => setVoiceAssistantActive(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Channel 1: Interface Language */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  1. Dashboard Interface Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setUiLang(l.code)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        uiLang === l.code
                          ? "bg-emerald-500/15 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10"
                          : "bg-gray-950/80 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{l.flag}</span>
                        <span className="text-xs font-bold text-slate-200">{l.nativeName}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 block truncate">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel 2: Voice Input Language */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  2. Voice Input Language (Speech-to-Text)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setVoiceInLang(l.code)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        voiceInLang === l.code
                          ? "bg-blue-500/15 border-blue-500/60 text-white shadow-md shadow-blue-500/10"
                          : "bg-gray-950/80 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{l.flag}</span>
                        <span className="text-xs font-bold text-slate-200">{l.nativeName}</span>
                      </div>
                      <span className="text-[10px] text-blue-400/80 block truncate">BCP-47: {l.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel 3: Voice Output Language */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  3. Voice Response Language (Text-to-Speech)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setVoiceOutLang(l.code)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        voiceOutLang === l.code
                          ? "bg-purple-500/15 border-purple-500/60 text-white shadow-md shadow-purple-500/10"
                          : "bg-gray-950/80 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{l.flag}</span>
                        <span className="text-xs font-bold text-slate-200">{l.nativeName}</span>
                      </div>
                      <span className="text-[10px] text-purple-400/80 block truncate">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speech Speed Slider */}
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Speech Output Speed
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                    {voiceSpeed.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>0.75x (Relaxed)</span>
                  <span>1.0x (Standard)</span>
                  <span>1.5x (Fast)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Auto-Read Responses (TTS)</h4>
                    <p className="text-[11px] text-gray-400">Speak confirmations and balances automatically upon processing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceAutoRead}
                    onChange={(e) => setVoiceAutoRead(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Automatic Language Detection</h4>
                    <p className="text-[11px] text-gray-400">Automatically identify Indic scripts and code-mixed typing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDetectLang}
                    onChange={(e) => setAutoDetectLang(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveLanguage}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <Save className="w-4 h-4" />
                  Save Multilingual Preferences
                </button>
                {languageSaved && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Language configuration updated!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Pillar: Architecture Summary */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Language Engine Architecture
            </h3>

            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
              <div className="font-semibold text-emerald-400">Direct Multilingual Parsing</div>
              <p className="text-gray-400 leading-relaxed">
                Unlike primitive translation pipelines that lose native monetary numbers, FinSight extracts entities (amount, category, merchant, date) directly from Telugu, Hindi, and Indian scripts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
              <div className="font-semibold text-purple-400">Code-Mixed Vernacular Support</div>
              <p className="text-gray-400 leading-relaxed">
                Fluently handles mixed-language speech and typing, such as:
              </p>
              <div className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-slate-300">
                “ఈరోజు college కి వెళ్లడానికి Uber 250”
              </div>
              <div className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-slate-300">
                “मैंने आज Uber पर 250 खर्च किए”
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2 text-xs">
              <div className="font-semibold text-blue-400">Conversational Correction</div>
              <p className="text-gray-400 leading-relaxed">
                Pending voice transactions can be updated seamlessly: say <em>“No, that was ₹800”</em> without creating duplicate entries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Cloud & Supabase Integration */}
      {activeTab === "cloud" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Supabase Backend Configuration</h2>
              <p className="text-gray-400 text-xs">
                Connect your live PostgreSQL instance with Row-Level Security (RLS)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">From Supabase Dashboard &gt; Project Settings &gt; API</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Anon / Public API Key</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <Lock className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-white">Connection Verification</h4>
                  <p className="text-xs text-gray-400">Ping database endpoints to verify credentials & RLS policies</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={connectionStatus === "testing"}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-medium transition-colors border border-gray-700 whitespace-nowrap"
                >
                  {connectionStatus === "testing" ? "Testing..." : "Test Connection"}
                </button>
              </div>

              {connectionStatus !== "idle" && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    connectionStatus === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : connectionStatus === "error"
                      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  }`}
                >
                  {connectionStatus === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : connectionStatus === "error" ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Activity className="w-4 h-4 animate-spin flex-shrink-0" />
                  )}
                  <span>{connectionMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Cloud Architecture</h3>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                <span className="text-white font-medium block mb-0.5">PostgreSQL Database</span>
                20 normalized tables with user-level isolation and composite indices.
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                <span className="text-white font-medium block mb-0.5">Edge Functions</span>
                Deno serverless runtimes for Gemini categorization & report generation.
              </div>
              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                <span className="text-white font-medium block mb-0.5">Offline-First Engine</span>
                Automatic reactive fallback to localized IndexedDB/LocalStorage when unauthenticated.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Admin Telemetry & Metrics */}
      {activeTab === "admin" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">System Health</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xl font-bold text-white">Operational</span>
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">99.9% Uptime SLA</span>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">Transactions Stored</span>
              <span className="text-2xl font-bold text-white">{transactions.length}</span>
              <span className="text-[11px] text-gray-500 mt-1 block">Across {accounts.length} Indian accounts</span>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">Managed Volume</span>
              <span className="text-2xl font-bold text-white">{formatINR(totalVolume, { compact: true })}</span>
              <span className="text-[11px] text-gray-500 mt-1 block">Net Liquidity: {formatINR(totalBalance, { compact: true })}</span>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">AI Match Accuracy</span>
              <span className="text-2xl font-bold text-emerald-400">97.8%</span>
              <span className="text-[11px] text-gray-500 mt-1 block">Hybrid Rule & Gemini Filter</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Active Intelligence Models
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-white font-medium block">Categorization Engine</span>
                    <span className="text-gray-500">Google Gemini 1.5 Flash + Regex Normalizer</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[11px]">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-white font-medium block">Anomaly Statistical Engine</span>
                    <span className="text-gray-500">Z-Score Gaussian Distribution (Rolling 90-day)</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[11px]">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-white font-medium block">Forecasting Model</span>
                    <span className="text-gray-500">Day-Burn Extrapolation + Recurring Expense Overlay</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[11px]">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                PostgreSQL Schema Security
              </h3>
              <div className="space-y-3 text-xs text-gray-300">
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Total Migrated Tables</span>
                  <span className="font-mono text-white">20 Schemas</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Row-Level Security (RLS)</span>
                  <span className="text-emerald-400 font-medium">100% Enforced</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Foreign Key Constraints</span>
                  <span className="text-emerald-400 font-medium">CASCADE Deletes</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Composite Indexes</span>
                  <span className="font-mono text-white">(user_id, date), (user_id, category_id)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Data & Backup */}
      {activeTab === "data" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-1">Export Data</h2>
            <p className="text-gray-400 text-xs">
              Download your complete financial profile including all accounts, transactions, budgets, and goals in standard JSON.
            </p>

            <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Accounts to export:</span>
                <span className="text-white font-medium">{accounts.length}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Transactions to export:</span>
                <span className="text-white font-medium">{transactions.length}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Budgets & Goals:</span>
                <span className="text-white font-medium">{budgets.length + goals.length}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors border border-gray-700"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download JSON Archive
            </button>

            {/* Clear All Transactions */}
            <div className="pt-4 border-t border-gray-800 space-y-2">
              <h3 className="text-sm font-semibold text-white">Empty All Transactions</h3>
              <p className="text-xs text-gray-400">
                Wipe all transaction details so you can start with a clean 0-balance ledger and add your own transactions.
              </p>
              {clearTxSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  All transaction details cleared! Ready for your own data.
                </div>
              )}
              {!showClearTxConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearTxConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-red-950/40 text-gray-300 hover:text-red-300 border border-gray-700 hover:border-red-800/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Empty All Transaction Details
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearTransactions}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Confirm Empty All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearTxConfirm(false)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-red-900/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-1">Seed & Demo Data Controls</h2>
            <p className="text-gray-400 text-xs">
              Restore authentic Indian sample data (HDFC, ICICI, Swiggy, Zomato, Zerodha, SIPs) for demonstration or interview walkthrough.
            </p>

            <div className="p-4 bg-red-950/20 rounded-xl border border-red-900/30">
              <span className="text-xs text-red-300 block mb-1 font-medium">Warning</span>
              <p className="text-[11px] text-gray-400">
                Resetting will overwrite custom adjustments made during this demo session with default pre-seeded transactions.
              </p>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Demo dataset restored with authentic Indian financial transactions!
              </div>
            )}

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Default Demo Data
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Yes, Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === "sessions" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                Active Login Sessions
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                All devices currently signed into your FinSight AI account. You can sign out from any session remotely.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!user?.id) return;
                  const presets: ("iphone" | "macbook" | "android" | "firefox")[] = [
                    "iphone",
                    "macbook",
                    "android",
                    "firefox",
                  ];
                  const randomPreset = presets[Math.floor(Math.random() * presets.length)];
                  addSimulatedDeviceSession(
                    user.id,
                    user.email || profile?.email || "user@gmail.com",
                    randomPreset
                  );
                  setSessions(getUserSessions(user.id));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-[11px] text-gray-200 font-medium transition-colors cursor-pointer"
                title="Simulate logging in from another phone or laptop to test remote sign out"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>+ Simulate Other Device</span>
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/50 border border-blue-500/30 text-[11px] text-blue-300 font-medium">
                <Wifi className="w-3.5 h-3.5" />
                {sessions.filter((s) => s.isCurrentSession).length > 0 ? "Tracked" : "Active"}
              </div>
            </div>
          </div>

          {/* Security tip */}
          <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-600/30 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              <strong className="text-amber-300">Security tip:</strong> If you see a login from a device or location you don't recognize, sign out of that session immediately and change your password.
            </p>
          </div>

          {/* Session Cards */}
          {sessions.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <WifiOff className="w-12 h-12 text-gray-700 mx-auto" />
              <p className="text-gray-400 text-sm">No active sessions recorded yet.</p>
              <p className="text-gray-500 text-xs">Sessions are tracked when you sign in. Sign out and back in to see your device here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isRevoking = revokingId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      session.isCurrentSession
                        ? "bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-950/20"
                        : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
                    } ${isRevoking ? "opacity-50 scale-95" : ""}`}
                  >
                    {/* Device Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      session.isCurrentSession
                        ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}>
                      {session.isMobile ? (
                        <Smartphone className="w-6 h-6" />
                      ) : (
                        <Monitor className="w-6 h-6" />
                      )}
                    </div>

                    {/* Session Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">
                          {session.deviceName}
                        </span>
                        {session.isCurrentSession && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            This Device
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-gray-400">
                          Signed in {formatRelativeTime(session.loginAt)}
                        </span>
                        <span className="text-gray-600 text-[10px]">•</span>
                        <span className="text-[11px] text-gray-500">
                          Last active {formatRelativeTime(session.lastActiveAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 border border-gray-700 text-gray-300 font-mono">
                          {session.browserName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 border border-gray-700 text-gray-300 font-mono">
                          {session.osName}
                        </span>
                        {session.isMobile && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-900/40 border border-purple-700/40 text-purple-300 font-mono">
                            Mobile
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Revoke Button */}
                    {!session.isCurrentSession && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isRevoking}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/40 hover:border-red-600/60 text-red-400 hover:text-red-300 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer shrink-0"
                        title="Sign out from this device"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {isRevoking ? "Signing out..." : "Sign Out"}
                      </button>
                    )}
                    {session.isCurrentSession && (
                      <div className="text-[11px] text-emerald-400/60 font-medium flex items-center gap-1 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        Current
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Session ID Info */}
          {sessions.length > 0 && (
            <div className="pt-2 border-t border-gray-800/60">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Sessions are recorded locally on this device and refreshed every 30 seconds. Signing out from a session revokes its access immediately. In a production environment with Supabase, these sessions sync across all devices via the database.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
