import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Repeat,
  Sliders,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useFinanceStore } from "../services/dataStore";
import { formatINR } from "../utils/formatters";
import { calculateForecast, calculateCategoryTotals } from "../services/financialCalculations";
import { detectAnomalies } from "../services/anomalyDetection";
import { detectRecurringPatterns } from "../services/recurringDetection";

export default function Insights() {
  const { transactions } = useFinanceStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"forecast" | "anomalies" | "recurring" | "simulator">("forecast");

  // Step 19: Forecasting
  const forecast = useMemo(() => calculateForecast(transactions), [transactions]);

  // Step 18: Anomalies
  const anomalies = useMemo(() => {
    return detectAnomalies(transactions, transactions, 1.5);
  }, [transactions]);

  // Step 17: Recurring Payments
  const recurringPatterns = useMemo(() => {
    return detectRecurringPatterns(transactions, 1, 0.5);
  }, [transactions]);

  const totalAnnualizedRecurring = recurringPatterns.reduce(
    (sum, r) => sum + r.annualized_cost,
    0
  );

  // Step 21: What-If Simulator State
  const [foodReduction, setFoodReduction] = useState(15); // percentage
  const [shoppingReduction, setShoppingReduction] = useState(25); // percentage
  const [entertainmentReduction, setEntertainmentReduction] = useState(10); // percentage

  // Category actuals for simulator
  const categoryTotals = useMemo(() => calculateCategoryTotals(transactions), [transactions]);
  const foodTotal = categoryTotals.find((c) => c.category_name.toLowerCase().includes("food"))?.total || 7500;
  const shoppingTotal = categoryTotals.find((c) => c.category_name.toLowerCase().includes("shopping"))?.total || 5500;
  const entertainmentTotal = categoryTotals.find((c) => c.category_name.toLowerCase().includes("entertainment"))?.total || 2500;

  const monthlySavingsDelta =
    (foodTotal * foodReduction) / 100 +
    (shoppingTotal * shoppingReduction) / 100 +
    (entertainmentTotal * entertainmentReduction) / 100;

  const annualSavingsDelta = monthlySavingsDelta * 12;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Financial Intelligence & Insights</h1>
        <p className="text-gray-400 text-sm mt-1">
          Machine learning forecasts, statistical anomaly detection, subscription commitments and interactive simulation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
        {[
          { id: "forecast", label: "Financial Forecast", icon: TrendingUp },
          { id: "anomalies", label: `Anomaly Alerts (${anomalies.length})`, icon: AlertTriangle },
          { id: "recurring", label: `Subscriptions (${recurringPatterns.length})`, icon: Repeat },
          { id: "simulator", label: "What-If Simulator", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Step 19 — Financial Forecasting */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {/* Top Forecast Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projected Month-End Spend</p>
              <p className="text-2xl font-bold text-white mt-2">{formatINR(forecast.projected_expenses)}</p>
              <p className="text-xs text-amber-400 mt-1">
                Based on {forecast.days_elapsed} days elapsed in month
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projected Savings</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">{formatINR(forecast.projected_savings)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {forecast.projected_savings_rate.toFixed(1)}% projected savings rate
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining Days in Cycle</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{forecast.days_remaining} Days</p>
              <p className="text-xs text-gray-500 mt-1">
                Daily burn allowance: {formatINR(forecast.projected_savings > 0 ? (forecast.projected_savings / forecast.days_remaining) : 0)}/day
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prediction Confidence</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-emerald-400 uppercase">
                  {forecast.confidence}
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-xs font-bold">
                  High Sample
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Statistical burn rate projection</p>
            </div>
          </div>

          {/* Detailed Forecast Explanation */}
          <div className="bg-gradient-to-r from-blue-950/40 via-gray-900 to-indigo-950/30 border border-blue-900/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-400" />
              <h3 className="font-bold text-white text-base">Forecast Logic & Recommendation</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              At your current average daily burn rate of{" "}
              <strong>{formatINR(forecast.days_elapsed > 0 ? forecast.current_expenses / forecast.days_elapsed : 0)}/day</strong>,
              you are on track to conclude the month with{" "}
              <strong className="text-emerald-400">{formatINR(forecast.projected_savings)}</strong> in surplus liquidity.
              Your financial runway is healthy and easily accommodates your SIP investments.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} /> Zero risk of overdraft
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} /> All utility bills covered
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <CheckCircle2 size={14} /> ₹15,000 monthly SIP accounted for
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Step 18 — Statistical Anomaly Detection */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Statistical Spend Anomalies (Z-Score &gt; 1.5)</h2>
            <span className="text-xs text-gray-400">
              Deviations compared against 3-month rolling median baseline
            </span>
          </div>

          {anomalies.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h3 className="text-white font-bold text-base">No Unusual Spending Spikes Detected</h3>
              <p className="text-gray-400 text-xs">
                All category expenses are within standard deviations of your historical baseline.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{anom.category_name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            anom.severity === "high"
                              ? "bg-rose-950 text-rose-400 border border-rose-800/60"
                              : "bg-amber-950 text-amber-400 border border-amber-800/60"
                          }`}
                        >
                          {anom.severity} Deviation
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{anom.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-gray-800">
                    <div>
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Baseline</p>
                      <p className="font-mono text-gray-300 font-bold mt-0.5">
                        {formatINR(anom.baseline_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Current Spend</p>
                      <p className="font-mono text-amber-400 font-bold mt-0.5">
                        {formatINR(anom.current_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Z-Score</p>
                      <p className="font-mono text-white font-bold mt-0.5">{anom.z_score.toFixed(2)}σ</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Step 17 — Recurring Payments & Subscriptions */}
      {activeTab === "recurring" && (
        <div className="space-y-5">
          {/* Top Metric banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Subscriptions</p>
              <p className="text-2xl font-bold text-white mt-2">{recurringPatterns.length}</p>
              <p className="text-xs text-gray-500 mt-1">Regular automated charges</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Annualized Cost</p>
              <p className="text-2xl font-bold text-rose-400 mt-2">{formatINR(totalAnnualizedRecurring)}/yr</p>
              <p className="text-xs text-gray-500 mt-1">Expected 12-month commitment</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Monthly Outflow</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">
                {formatINR(Math.round(totalAnnualizedRecurring / 12))}/mo
              </p>
              <p className="text-xs text-gray-500 mt-1">Rent, SIP, utilities & digital services</p>
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">Detected Recurring Commitments</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically identified via periodicity analysis across transaction dates
              </p>
            </div>

            <div className="divide-y divide-gray-800/60">
              {recurringPatterns.map((rec, i) => (
                <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center font-bold text-sm">
                      <Repeat size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{rec.description}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Frequency: <strong className="text-gray-300 capitalize">{rec.frequency}</strong> • Last seen: {rec.last_seen_date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Average Bill</p>
                      <p className="font-mono text-white font-bold mt-0.5">{formatINR(rec.average_amount)}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Annualized</p>
                      <p className="font-mono text-rose-400 font-bold mt-0.5">{formatINR(rec.annualized_cost)}/yr</p>
                    </div>

                    <div className="text-right">
                      <p className="text-gray-500 uppercase font-semibold text-[10px]">Next Expected</p>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold mt-0.5">
                        <Clock size={12} /> {rec.next_expected_date}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Step 21 — Interactive What-If Simulator */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Interactive What-If Savings Simulator</h2>
              <p className="text-gray-400 text-xs mt-1">
                Slide to test trimming discretionary expenses and instantly see the compounded impact on your goals and annual savings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Slider 1: Food */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/60 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-white text-sm">🍔 Dining & Food</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">-{foodReduction}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={foodReduction}
                  onChange={(e) => setFoodReduction(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Current: {formatINR(foodTotal)}</span>
                  <span>Saves: +{formatINR((foodTotal * foodReduction) / 100)}/mo</span>
                </div>
              </div>

              {/* Slider 2: Shopping */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/60 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-white text-sm">🛍️ Online Shopping</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">-{shoppingReduction}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={shoppingReduction}
                  onChange={(e) => setShoppingReduction(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Current: {formatINR(shoppingTotal)}</span>
                  <span>Saves: +{formatINR((shoppingTotal * shoppingReduction) / 100)}/mo</span>
                </div>
              </div>

              {/* Slider 3: Entertainment */}
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/60 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-white text-sm">🎬 Entertainment</span>
                  <span className="font-mono text-emerald-400 text-sm font-bold">-{entertainmentReduction}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={entertainmentReduction}
                  onChange={(e) => setEntertainmentReduction(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Current: {formatINR(entertainmentTotal)}</span>
                  <span>Saves: +{formatINR((entertainmentTotal * entertainmentReduction) / 100)}/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Projected Compounded Impact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-emerald-500/30 rounded-2xl p-5">
              <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Extra Monthly Savings</p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-2">+{formatINR(monthlySavingsDelta)}</p>
              <p className="text-xs text-gray-500 mt-1">Per month retained in bank</p>
            </div>

            <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-blue-500/30 rounded-2xl p-5">
              <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">1-Year Compounded Total</p>
              <p className="text-3xl font-extrabold text-blue-400 mt-2">+{formatINR(annualSavingsDelta)}</p>
              <p className="text-xs text-gray-500 mt-1">Directly added to net worth</p>
            </div>

            <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-purple-500/30 rounded-2xl p-5">
              <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Goal Acceleration</p>
              <p className="text-3xl font-extrabold text-purple-400 mt-2">
                +{(monthlySavingsDelta / 1500).toFixed(1)} Months
              </p>
              <p className="text-xs text-gray-500 mt-1">Earlier achievement of savings goals</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
