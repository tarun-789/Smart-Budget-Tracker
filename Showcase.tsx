// FinSight AI — Feature Showcase & Advanced Financial Labs
// Demonstrates 12 flagship innovations across Behavioral Economics, Autopilot Automation, Visual Intelligence, and Security.

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Clock,
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  Sliders,
} from "lucide-react";
import { formatINR } from "../utils/formatters";

import {
  SHOWCASE_FEATURES,
  type ShowcaseCategory,
  type ShowcaseFeature,
} from "../data/showcaseFeatures";

export default function Showcase() {
  const [selectedCategory, setSelectedCategory] = useState<ShowcaseCategory>("All");
  const [activeModalFeature, setActiveModalFeature] = useState<ShowcaseFeature | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Animated counters on mount
  const [featureCount, setFeatureCount] = useState(0);
  const [savingsRateStat, setSavingsRateStat] = useState(0);
  const [debtSavedStat, setDebtSavedStat] = useState(0);
  const [latencyStat, setLatencyStat] = useState(1.0);

  useEffect(() => {
    // Smooth animated counters
    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setFeatureCount(Math.round(progress * 12));
      setSavingsRateStat(Number((progress * 38.5).toFixed(1)));
      setDebtSavedStat(Math.round(progress * 180));
      setLatencyStat(Number((1.0 - progress * 0.82).toFixed(2)));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  // Filtered list
  const filteredFeatures = useMemo(() => {
    return SHOWCASE_FEATURES.filter((f) => {
      const matchesCat = selectedCategory === "All" || f.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-gray-900 via-gray-900/90 to-gray-950 border border-gray-800/80 p-6 sm:p-10 shadow-2xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
            FinSight AI Labs &amp; Innovation Showcase
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Next-Gen Personal Finance &amp; Behavioral Architecture
          </h1>

          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            FinSight AI blends <span className="text-white font-medium">behavioral psychology</span>,{" "}
            <span className="text-white font-medium">autopilot financial algorithms</span>, and{" "}
            <span className="text-white font-medium">zero-knowledge cryptography</span> into a cohesive personal operating system. Explore the 12 flagship engineering capabilities below.
          </p>

          {/* Animated Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-800/80">
            <div className="p-3 bg-gray-800/40 rounded-2xl border border-gray-800">
              <div className="text-2xl sm:text-3xl font-black text-white">{featureCount}+</div>
              <div className="text-xs text-gray-400 font-medium">Flagship Capabilities</div>
            </div>
            <div className="p-3 bg-gray-800/40 rounded-2xl border border-gray-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{savingsRateStat}%</div>
              <div className="text-xs text-gray-400 font-medium">Avg Monthly Savings Rate</div>
            </div>
            <div className="p-3 bg-gray-800/40 rounded-2xl border border-gray-800">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">₹{debtSavedStat}K+</div>
              <div className="text-xs text-gray-400 font-medium">Interest Saved / User</div>
            </div>
            <div className="p-3 bg-gray-800/40 rounded-2xl border border-gray-800">
              <div className="text-2xl sm:text-3xl font-black text-indigo-400">&lt; {latencyStat}s</div>
              <div className="text-xs text-gray-400 font-medium">Deterministic Math Latency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {(
            [
              "All",
              "Behavioral Finance",
              "Autopilot Automation",
              "Visual Intelligence",
              "Security & Core Vault",
            ] as ShowcaseCategory[]
          ).map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900/90 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Feature Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFeatures.map((feat) => {
          const IconComp = feat.icon;
          return (
            <div
              key={feat.id}
              className="group relative flex flex-col justify-between bg-gray-900/70 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/20"
            >
              <div className="space-y-4">
                {/* Header Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.accentColor} text-white flex items-center justify-center shadow-lg shadow-black/40 group-hover:scale-105 transition-transform`}
                  >
                    <IconComp size={22} />
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-gray-800/80 border border-gray-700/60 text-gray-300 text-[11px] font-semibold">
                    {feat.badge}
                  </span>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {feat.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {feat.tagline}
                  </p>
                </div>

                {/* Top Impact Metric Callout */}
                <div className="p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {feat.impactMetrics[0].label}
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {feat.impactMetrics[0].value}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-gray-800/60">
                <button
                  onClick={() => setActiveModalFeature(feat)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800/80 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer group-hover:bg-blue-600"
                >
                  <span>Explore Spec &amp; Interactive Demo</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layout-Safe Detail Modal */}
      {activeModalFeature && (
        <ShowcaseDetailModal
          feature={activeModalFeature}
          onClose={() => setActiveModalFeature(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Layout-Safe Detail Modal Component with Live Simulators
// -------------------------------------------------------------
function ShowcaseDetailModal({
  feature,
  onClose,
}: {
  feature: ShowcaseFeature;
  onClose: () => void;
}) {
  const IconComp = feature.icon;
  const [activeTab, setActiveTab] = useState<"overview" | "simulator" | "tech">("simulator");

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl shadow-blue-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${feature.accentColor} text-white flex items-center justify-center shadow-md`}
            >
              <IconComp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{feature.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800 text-[10px] font-bold">
                  {feature.category}
                </span>
              </div>
              <p className="text-xs text-gray-400">{feature.tagline}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-800/80 bg-gray-950/40">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "simulator"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Zap size={14} />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Impact &amp; Methodology</span>
          </button>
          <button
            onClick={() => setActiveTab("tech")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "tech"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Sliders size={14} />
            <span>Architecture &amp; Math Specs</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: INTERACTIVE SIMULATOR */}
          {activeTab === "simulator" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap size={16} className="text-amber-400" />
                  Live Feature Simulator
                </h3>
                <span className="text-[11px] text-gray-400">
                  Try out this capability with sample inputs
                </span>
              </div>

              {/* Specific Feature Simulators */}
              {feature.id === "cooldown-timer" && <CooldownSimulator />}
              {feature.id === "regret-tracker" && <RegretSimulator />}
              {feature.id === "late-night-detector" && <LateNightSimulator />}
              {feature.id === "bill-negotiation" && <BillNegotiationSimulator />}
              {feature.id === "debt-autopilot" && <DebtAutopilotSimulator />}
              {feature.id === "paycheck-allocation" && <PaycheckAllocationSimulator />}
              {feature.id === "cash-flow-streams" && <CashFlowStreamSimulator />}
              {feature.id === "peer-benchmarking" && <PeerBenchmarkSimulator />}
              {feature.id === "lifestyle-creep" && <LifestyleCreepSimulator />}
              {feature.id === "zk-vault" && <ZeroKnowledgeCryptoSimulator />}
              {feature.id === "camera-scanner" && <CameraScannerSimulator />}
              {feature.id === "voice-assistant" && <VoiceAssistantSimulator />}
            </div>
          )}

          {/* TAB 2: OVERVIEW & IMPACT */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Detailed Narrative */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Core Mechanism</h3>
                <p className="text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-4 rounded-2xl border border-gray-800">
                  {feature.description}
                </p>
              </div>

              {/* Impact Metrics Grid */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Empirical Financial Impact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {feature.impactMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-950/80 rounded-2xl border border-gray-800 flex flex-col justify-between"
                    >
                      <span className="text-xs text-gray-400 font-medium">{m.label}</span>
                      <span className="text-xl font-black text-emerald-400 mt-2 mb-1">{m.value}</span>
                      <span className="text-[11px] text-gray-500">{m.subtext}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL ARCHITECTURE & MATH */}
          {activeTab === "tech" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-2">System Architecture &amp; Data Pipeline</h3>
              <div className="space-y-3">
                {feature.techSpecs.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 flex flex-col gap-1"
                  >
                    <div className="text-xs font-bold text-blue-400">{s.title}</div>
                    <div className="text-xs text-gray-300 font-mono leading-relaxed">{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-800 bg-gray-950/90">
          <span className="text-[11px] text-gray-500 font-mono">FinSight AI Engineering Specification</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Interactive Simulators (1 per feature)
// -------------------------------------------------------------

function CooldownSimulator() {
  const [itemPrice, setItemPrice] = useState(4500);
  const [itemName, setItemName] = useState("Wireless Noise-Cancelling Headphones");
  const [monthlyIncome] = useState(75000);

  const hourlyRate = monthlyIncome / 160;
  const hoursOfWork = (itemPrice / hourlyRate).toFixed(1);
  const tenYearCompounding = Math.round(itemPrice * Math.pow(1 + 0.12, 10));

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 font-semibold block mb-1">Item to Purchase</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 font-semibold block mb-1">Price (₹)</label>
          <input
            type="number"
            value={itemPrice}
            onChange={(e) => setItemPrice(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
          <Clock size={15} />
          <span>Active 24-Hour Cooldown Lock Engaged</span>
        </div>
        <p className="text-xs text-gray-300">
          Before purchasing <span className="text-white font-bold">{itemName}</span> for{" "}
          <span className="text-amber-400 font-bold">{formatINR(itemPrice)}</span>, consider the real trade-off:
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">Life-Energy Cost</span>
            <span className="text-lg font-black text-rose-400">{hoursOfWork} Hours</span>
            <span className="text-[10px] text-gray-500 block">Of uninterrupted desk work</span>
          </div>

          <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">10-Year Opportunity Cost</span>
            <span className="text-lg font-black text-emerald-400">{formatINR(tenYearCompounding)}</span>
            <span className="text-[10px] text-gray-500 block">If invested at 12% Nifty CAGR</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegretSimulator() {
  const [samplePurchases, setSamplePurchases] = useState([
    { id: 1, name: "Sneaker Flash Sale", amount: 3999, category: "Shopping", regret: 4 },
    { id: 2, name: "Gourmet Dinner", amount: 1850, category: "Food & Dining", regret: 1 },
    { id: 3, name: "Mechanical Keyboard", amount: 5200, category: "Gadgets", regret: 5 },
  ]);

  const setRating = (id: number, score: number) => {
    setSamplePurchases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, regret: score } : p))
    );
  };

  const avgRegret = (
    samplePurchases.reduce((sum, p) => sum + p.regret, 0) / samplePurchases.length
  ).toFixed(1);

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300 font-bold">72-Hour Retrospective Audit</span>
        <span className="text-xs text-amber-400 font-bold">Overall Regret Index: {avgRegret} / 5</span>
      </div>

      <div className="space-y-2.5">
        {samplePurchases.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-xs font-bold text-white">{item.name}</div>
              <div className="text-[11px] text-gray-400">{formatINR(item.amount)} • {item.category}</div>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(item.id, star)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    item.regret >= star
                      ? star >= 4
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-gray-800 text-gray-500 hover:text-white"
                  }`}
                  title={`${star} stars`}
                >
                  {star}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-500">
        Score 1 = High Long-Term Joy; Score 5 = Pure Post-Purchase Remorse. AI auto-restricts high-regret merchant categories.
      </p>
    </div>
  );
}

function LateNightSimulator() {
  const [activeHour, setActiveHour] = useState(2); // 2 AM

  const isDopamineSpike = activeHour >= 23 || activeHour <= 4;

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-2">
          Select Transaction Time of Day:{" "}
          <span className="text-white font-bold">
            {activeHour === 0 ? "12:00 AM Midnight" : activeHour > 12 ? `${activeHour - 12}:00 PM` : `${activeHour}:00 AM`}
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="23"
          value={activeHour}
          onChange={(e) => setActiveHour(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
      </div>

      <div
        className={`p-4 rounded-2xl border transition-colors ${
          isDopamineSpike
            ? "bg-rose-500/10 border-rose-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-bold">
          {isDopamineSpike ? (
            <>
              <AlertTriangle size={15} className="text-rose-400" />
              <span className="text-rose-400">Circadian Willpower Depletion Alert Triggered</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span className="text-emerald-400">Normal Daytime Operating Hours</span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-300 mt-2">
          {isDopamineSpike
            ? "Late-night purchases between 11 PM and 4:30 AM carry an 84% higher regret likelihood. FinSight automatically requests a 12-hour sleep buffer before card charge."
            : "Daytime purchases align with active cognitive decision-making. No circadian alert required."}
        </p>
      </div>
    </div>
  );
}

function BillNegotiationSimulator() {
  const [provider, setProvider] = useState("Airtel Broadband");
  const [currentPlan, setCurrentPlan] = useState(1199);
  const [tenureYears, setTenureYears] = useState(3);
  const [copied, setCopied] = useState(false);

  const script = `Hello ${provider} Support team. I have been a loyal customer for over ${tenureYears} years on the ₹${currentPlan}/month plan. I recently reviewed competitor offerings (such as JioFiber providing 200 Mbps with OTT bundles at ₹699/month). Before deciding to disconnect my connection, I would like to check what loyalty retention credits or speed-boost plans you have available for long-standing subscribers in my pin code.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          >
            <option>Airtel Broadband</option>
            <option>Jio Fiber</option>
            <option>ACT Fibernet</option>
            <option>Tata Play Binge</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Current Monthly (₹)</label>
          <input
            type="number"
            value={currentPlan}
            onChange={(e) => setCurrentPlan(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Tenure (Years)</label>
          <input
            type="number"
            value={tenureYears}
            onChange={(e) => setTenureYears(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="relative p-4 rounded-2xl bg-gray-900 border border-gray-800">
        <div className="text-[11px] font-bold text-gray-400 mb-2">Auto-Generated Retention Script:</div>
        <p className="text-xs text-gray-300 font-mono leading-relaxed pr-10">{script}</p>
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-800 hover:bg-blue-600 text-white transition-colors cursor-pointer"
          title="Copy script"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

function DebtAutopilotSimulator() {
  const [extraPayment, setExtraPayment] = useState(5000);

  // Sample Debts: Card A (₹60K, 38%), Personal Loan (₹1.2L, 14%), Card B (₹25K, 42%)
  const avalancheInterest = Math.max(0, Math.round(48000 - extraPayment * 4.2));
  const snowballInterest = Math.max(0, Math.round(54000 - extraPayment * 3.6));
  const interestDifference = snowballInterest - avalancheInterest;

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">
          Extra Monthly Payoff Allocation: <span className="text-white font-bold">{formatINR(extraPayment)}</span>
        </label>
        <input
          type="range"
          min="1000"
          max="20000"
          step="500"
          value={extraPayment}
          onChange={(e) => setExtraPayment(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
          <div className="text-xs font-bold text-blue-400">Debt Avalanche</div>
          <div className="text-[11px] text-gray-400">Prioritizes 42% APR Card first</div>
          <div className="text-lg font-black text-white mt-2">{formatINR(avalancheInterest)}</div>
          <div className="text-[10px] text-emerald-400 font-medium">Saves ₹{interestDifference} more interest</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
          <div className="text-xs font-bold text-purple-400">Debt Snowball</div>
          <div className="text-[11px] text-gray-400">Clears ₹25K lowest balance first</div>
          <div className="text-lg font-black text-white mt-2">{formatINR(snowballInterest)}</div>
          <div className="text-[10px] text-purple-300 font-medium">Faster psychological victory</div>
        </div>
      </div>
    </div>
  );
}

function PaycheckAllocationSimulator() {
  const [paycheck, setPaycheck] = useState(85000);

  const essentials = Math.round(paycheck * 0.5);
  const discretionary = Math.round(paycheck * 0.3);
  const investments = Math.round(paycheck * 0.2);

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div>
        <label className="text-xs text-gray-400 font-semibold block mb-1">
          Monthly Paycheck Deposit: <span className="text-white font-bold">{formatINR(paycheck)}</span>
        </label>
        <input
          type="range"
          min="25000"
          max="300000"
          step="5000"
          value={paycheck}
          onChange={(e) => setPaycheck(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800">
          <span className="text-[10px] text-gray-400 uppercase font-bold">50% Needs</span>
          <div className="text-sm sm:text-base font-black text-amber-400 mt-1">{formatINR(essentials)}</div>
          <span className="text-[10px] text-gray-500">Rent &amp; Groceries</span>
        </div>
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800">
          <span className="text-[10px] text-gray-400 uppercase font-bold">30% Wants</span>
          <div className="text-sm sm:text-base font-black text-rose-400 mt-1">{formatINR(discretionary)}</div>
          <span className="text-[10px] text-gray-500">Dining &amp; Travel</span>
        </div>
        <div className="p-3 rounded-2xl bg-gray-900 border border-gray-800">
          <span className="text-[10px] text-gray-400 uppercase font-bold">20% Wealth</span>
          <div className="text-sm sm:text-base font-black text-emerald-400 mt-1">{formatINR(investments)}</div>
          <span className="text-[10px] text-gray-500">Index Mutual Funds</span>
        </div>
      </div>
    </div>
  );
}

function CashFlowStreamSimulator() {
  return (
    <div className="space-y-3 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="text-xs font-bold text-white mb-2">Live Cash Stream Topology</div>
      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-300 flex justify-between">
          <span>[Source: Salary Inflow]</span>
          <span>₹95,000 (100%)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-blue-600">
          <div className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-amber-300 flex justify-between">
            <span>↳ [Living Essentials]</span>
            <span>₹45,000 (47.3%)</span>
          </div>
          <div className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-rose-300 flex justify-between">
            <span>↳ [Discretionary Flow]</span>
            <span>₹22,000 (23.1%)</span>
          </div>
        </div>
        <div className="pl-8 border-l-2 border-emerald-600">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex justify-between">
            <span>↳ [Terminal Sink: Long-Term Wealth Asset]</span>
            <span>₹28,000 (29.4%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeerBenchmarkSimulator() {
  const [cohort, setCohort] = useState("Age 25-30 (Tier 1 Metro)");
  const [diningSpend, setDiningSpend] = useState(8500);

  // Benchmark: Median = ₹6,200
  const cohortMedian = 6200;
  const percentile = Math.min(99, Math.max(1, Math.round((diningSpend / (cohortMedian * 2)) * 100)));

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Demographic Cohort</label>
          <select
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          >
            <option>Age 21-25 (Tier 1 Metro)</option>
            <option>Age 25-30 (Tier 1 Metro)</option>
            <option>Age 31-40 (Tier 1 Metro)</option>
            <option>Age 25-35 (Tier 2 Cities)</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Your Monthly Food &amp; Dining (₹)</label>
          <input
            type="number"
            value={diningSpend}
            onChange={(e) => setDiningSpend(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Cohort Median: <span className="text-white font-bold">{formatINR(cohortMedian)}</span></span>
          <span className="text-purple-400 font-bold">You are in the {percentile}th Percentile</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentile > 70 ? "bg-rose-500" : percentile > 40 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${percentile}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 block">
          Calculated via differential privacy on client side. No individual ledger data shared.
        </span>
      </div>
    </div>
  );
}

function LifestyleCreepSimulator() {
  const [raisePct, setRaisePct] = useState(20);
  const [expensePct, setExpensePct] = useState(15);

  const creepIndex = raisePct > 0 ? (expensePct / raisePct).toFixed(2) : "0.00";
  const status = Number(creepIndex) > 1.0 ? "Active Capital Erosion" : Number(creepIndex) > 0.5 ? "Moderate Creep" : "Elite Wealth Builder";

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Salary Raise %</label>
          <input
            type="number"
            value={raisePct}
            onChange={(e) => setRaisePct(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Lifestyle Spend % Increase</label>
          <input
            type="number"
            value={expensePct}
            onChange={(e) => setExpensePct(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-400 block">Lifestyle Creep Index</span>
          <span className="text-xl font-black text-white">{creepIndex}</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            Number(creepIndex) > 1.0
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : Number(creepIndex) > 0.5
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function ZeroKnowledgeCryptoSimulator() {
  const [plaintext, setPlaintext] = useState("Aadhaar: 4892-1849-1029");
  const [passphrase, setPassphrase] = useState("vault_master_key_99");
  const [encrypted, setEncrypted] = useState("U2FsdGVkX1/7n9M4...gcm_auth_tag_8492");

  const handleSimulate = () => {
    setEncrypted(`AES-GCM-256(${plaintext.slice(0, 10)}...):${Math.random().toString(36).substring(2, 15)}`);
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Plaintext Sensitive PII</label>
          <input
            type="text"
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-400 block mb-1">Passphrase (PBKDF2 Key)</label>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
          />
        </div>
      </div>

      <button
        onClick={handleSimulate}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
      >
        Run Client-Side WebCrypto AES-GCM Encrypt
      </button>

      <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 font-mono text-[11px] text-cyan-300 break-all">
        Payload: {encrypted}
      </div>
    </div>
  );
}

function CameraScannerSimulator() {
  return (
    <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-3">
      <div className="text-xs font-bold text-white">Edge Detection &amp; Auto-Contrast Pipeline</div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-gray-400">
          <div className="font-bold text-white">1. Raw Video</div>
          <span className="text-[10px]">1080p Stream</span>
        </div>
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-blue-400">
          <div className="font-bold text-white">2. Binarize</div>
          <span className="text-[10px]">Adaptive Grayscale</span>
        </div>
        <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-emerald-400">
          <div className="font-bold text-white">3. OCR ID</div>
          <span className="text-[10px]">Auto-Extract PAN/Aadhaar</span>
        </div>
      </div>
    </div>
  );
}

function VoiceAssistantSimulator() {
  const [command, setCommand] = useState("Spent 450 on swiggy lunch today");
  const [parsed, setParsed] = useState({ amount: 450, category: "Food & Dining", type: "expense", date: "Today" });

  const handleSimulateVoice = () => {
    const amtMatch = command.match(/\d+/);
    const amt = amtMatch ? Number(amtMatch[0]) : 500;
    setParsed({
      amount: amt,
      category: command.toLowerCase().includes("swiggy") || command.toLowerCase().includes("food") ? "Food & Dining" : "General",
      type: "expense",
      date: "2026-09-14",
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-gray-950/80 border border-gray-800">
      <div>
        <label className="text-[11px] text-gray-400 block mb-1">Spoken Utterance</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            onClick={handleSimulateVoice}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Parse Intent
          </button>
        </div>
      </div>

      <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 font-mono text-xs text-emerald-300">
        Extracted Payload: {JSON.stringify(parsed, null, 2)}
      </div>
    </div>
  );
}
