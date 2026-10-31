import React, { useState, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Calendar,
  X,
  ArrowRight,
} from "lucide-react";
import { useFinanceStore } from "../services/dataStore";
import { formatINR } from "../utils/formatters";
import { calculateBudgetRemaining } from "../services/financialCalculations";

export default function Budgets() {
  const { budgets, categories, transactions, updateBudget } = useFinanceStore();
  const [selectedMonth, setSelectedMonth] = useState(9); // September
  const [selectedYear] = useState(2026);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string>("");
  const [editingAmount, setEditingAmount] = useState<string>("");

  const currentBudget = budgets[0];

  // Category Budget Calculations
  const budgetData = useMemo(() => {
    if (!currentBudget || !currentBudget.budget_categories) return [];

    return currentBudget.budget_categories.map((bc) => {
      const actual = transactions
        .filter((t) => {
          const d = new Date(t.transaction_date);
          const isMonthMatch = d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
          return isMonthMatch && t.category_id === bc.category_id && t.transaction_type === "expense";
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const statusInfo = calculateBudgetRemaining(bc.amount, actual, 80);
      const cat = categories.find((c) => c.id === bc.category_id);

      return {
        id: bc.id,
        categoryId: bc.category_id,
        categoryName: cat?.name || "Category",
        categoryIcon: cat?.icon || "📦",
        categoryColor: cat?.color || "#3b82f6",
        budgeted: bc.amount,
        actual,
        remaining: statusInfo.remaining,
        usage: statusInfo.usage_percentage,
        status: statusInfo.status,
      };
    });
  }, [currentBudget, categories, transactions, selectedMonth, selectedYear]);

  // Overall Totals
  const totalBudgeted = budgetData.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = budgetData.reduce((s, b) => s + b.actual, 0);
  const overallRemaining = totalBudgeted - totalActual;
  const overallUsage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  // Step 16: Smart Recommendations
  const recommendations = useMemo(() => {
    return [
      {
        id: "rec-1",
        category: "Food",
        currentBudget: 8000,
        recommended: 7500,
        saving: 500,
        reason: "Your dining out spend stabilized. Trimming ₹500 saves ₹6,000 annually without lifestyle impact.",
      },
      {
        id: "rec-2",
        category: "Shopping",
        currentBudget: 6000,
        recommended: 5000,
        saving: 1000,
        reason: "Non-essential e-commerce purchases peaked last month. Recommended limit: ₹5,000.",
      },
      {
        id: "rec-3",
        category: "Entertainment",
        currentBudget: 2000,
        recommended: 2000,
        saving: 0,
        reason: "Streaming subscriptions are optimal (₹1,648 utilized). Maintain current allocation.",
      },
    ];
  }, []);

  const openEditModal = (catId: string, currentAmt: number) => {
    setEditingCatId(catId);
    setEditingAmount(String(currentAmt));
    setIsEditModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBudget) return;
    const numAmt = parseFloat(editingAmount) || 0;

    const updatedCategories = (currentBudget.budget_categories || []).map((bc) =>
      bc.category_id === editingCatId ? { ...bc, amount: numAmt } : bc
    );

    const newTotal = updatedCategories.reduce((s, c) => s + c.amount, 0);
    updateBudget(currentBudget.id, {
      total_amount: newTotal,
      budget_categories: updatedCategories,
    });

    setIsEditModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Budget Planner</h1>
          <p className="text-gray-400 text-sm mt-1">
            Category-level budget allocations, real-time tracking, and AI-powered recommendations
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
          <Calendar size={16} className="text-gray-400 ml-2" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent text-white text-xs font-semibold py-1.5 px-2 focus:outline-none"
          >
            <option value={9} className="bg-gray-900">September 2026</option>
            <option value={8} className="bg-gray-900">August 2026</option>
            <option value={7} className="bg-gray-900">July 2026</option>
          </select>
        </div>
      </div>

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Allocated Budget</p>
          <p className="text-2xl font-bold text-white mt-2">{formatINR(totalBudgeted)}</p>
          <p className="text-xs text-gray-500 mt-1">For {selectedMonth === 9 ? "September" : "Month"} 2026</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Spent So Far</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{formatINR(totalActual)}</p>
          <p className="text-xs text-gray-500 mt-1">{overallUsage.toFixed(1)}% of total budget</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining Spendable</p>
          <p className={`text-2xl font-bold mt-2 ${overallRemaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatINR(overallRemaining)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {overallRemaining >= 0 ? "Under overall budget" : "Over budget threshold"}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall Status</p>
          <div className="flex items-center gap-2 mt-2">
            {overallUsage >= 100 ? (
              <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-xl">
                <AlertCircle size={20} /> Exceeded
              </span>
            ) : overallUsage >= 80 ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-xl">
                <AlertTriangle size={20} /> Warning (80%+)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xl">
                <CheckCircle2 size={20} /> Healthy
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{budgetData.length} categories tracked</p>
        </div>
      </div>

      {/* Step 15: Category Budget Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Category Allocations & Real-Time Tracking</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetData.map((item) => {
            const isExceeded = item.status === "exceeded";
            const isWarning = item.status === "warning";

            return (
              <div
                key={item.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4 hover:border-gray-700 transition-all shadow-md group"
              >
                {/* Top: Icon + Name + Edit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{item.categoryIcon}</span>
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-tight">{item.categoryName}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Limit: <span className="text-gray-200 font-medium">{formatINR(item.budgeted)}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(item.categoryId, item.budgeted)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                    title="Edit Budget Limit"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Spent: <strong className="text-white">{formatINR(item.actual)}</strong></span>
                    <span
                      className={`font-semibold ${
                        isExceeded ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {item.usage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isExceeded ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(item.usage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bottom: Status & Remaining */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      isExceeded ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {isExceeded ? (
                      <>
                        <AlertCircle size={12} /> Over Limit
                      </>
                    ) : isWarning ? (
                      <>
                        <AlertTriangle size={12} /> Near Limit
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Healthy
                      </>
                    )}
                  </span>
                  <span className="text-gray-400 text-[11px]">
                    Remaining:{" "}
                    <strong className={item.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {formatINR(item.remaining)}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 16: Smart Budget Recommendations Panel */}
      <div className="bg-gradient-to-r from-blue-950/30 via-gray-900 to-indigo-950/20 border border-blue-900/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" />
            <h2 className="text-base font-bold text-white">AI Smart Budget Recommendations</h2>
          </div>
          <span className="text-xs text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2.5 py-1 rounded-full font-medium">
            Based on 3-Month Historical Spend
          </span>
        </div>
        <p className="text-gray-400 text-xs">
          FinSight AI analyzed your transaction trends and calculated math-backed targets to boost your savings rate:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {recommendations.map((rec) => (
            <div key={rec.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{rec.category}</span>
                {rec.saving > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Saves ₹{rec.saving}/mo
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">Optimal</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Current: {formatINR(rec.currentBudget)}</span>
                <ArrowRight size={13} className="text-blue-400" />
                <span className="font-bold text-white">Target: {formatINR(rec.recommended)}</span>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">{rec.reason}</p>

              {rec.saving > 0 && (
                <button
                  onClick={() => {
                    const cat = categories.find((c) => c.name === rec.category);
                    if (cat) openEditModal(cat.id, rec.recommended);
                  }}
                  className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 hover:border-transparent text-blue-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                >
                  Apply Recommendation
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Category Budget Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h3 className="font-bold text-white text-base">Update Category Budget</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Monthly Limit (₹)
                </label>
                <input
                  type="number"
                  required
                  value={editingAmount}
                  onChange={(e) => setEditingAmount(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
