import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Receipt,
  FileText,
  Calendar,
  Mic,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";
import { useFinanceStore } from "../services/dataStore";
import { useDocumentStore } from "../services/documentStore";
import { useAuth } from "../contexts/AuthContext";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import {
  calculateIncome,
  calculateExpenses,
  calculateSavings,
  calculateSavingsRate,
  calculateCategoryTotals,
  calculateBudgetRemaining,
  calculateMonthlyTotals,
  extractDocumentObligations,
} from "../services/financialCalculations";
import { formatINR, formatDate } from "../utils/formatters";
import { formatDateWithDay } from "../utils/dateHelpers";
import { suggestCategoryFromMerchant } from "../services/merchantService";
import type { DateRangePreset, TransactionType, PaymentMethod } from "../types";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#6366f1", "#14b8a6", "#f97316", "#a855f7"
];

export default function Dashboard() {
  const { profile, isDemoMode } = useAuth();
  const {
    transactions,
    accounts,
    categories,
    budgets,
    addTransaction,
    clearTransactions,
    resetToDemoData,
  } = useFinanceStore();

  const { getDocuments } = useDocumentStore();
  const vaultDocuments = getDocuments();
  const documentObligations = useMemo(
    () => extractDocumentObligations(vaultDocuments),
    [vaultDocuments]
  );

  const { openVoiceAssistant, isListening: isVoiceListening } = useVoiceAssistant();

  const [datePreset, setDatePreset] = useState<DateRangePreset>("this_month");
  const [customDate, setCustomDate] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [accId, setAccId] = useState(accounts[0]?.id || "");
  const [catId, setCatId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("upi");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  // Live AI category suggestion
  const suggestedCatName = useMemo(() => {
    if (!desc.trim()) return null;
    return suggestCategoryFromMerchant(desc.trim());
  }, [desc]);

  const openAddModal = (prefillDate?: string | React.MouseEvent) => {
    const validDate = typeof prefillDate === "string" ? prefillDate : undefined;
    setDesc("");
    setAmount("");
    setTxType("expense");
    setAccId(accounts[0]?.id || "");
    setCatId(categories[0]?.id || "");
    setDate(validDate || customDate || new Date().toISOString().split("T")[0]);
    setPayMethod("upi");
    setNotes("");
    setIsRecurring(false);
    setIsAddModalOpen(true);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Math.abs(parseFloat(amount) || 0);
    if (!desc.trim() || num <= 0) return;

    const matchedCat = catId || (suggestedCatName
      ? categories.find((c) => c.name.toLowerCase() === suggestedCatName.toLowerCase())?.id
      : categories[0]?.id);

    addTransaction({
      user_id: profile?.id || "user",
      account_id: accId || accounts[0]?.id || "acc-default",
      merchant_id: null,
      amount: num,
      currency: "INR",
      transaction_type: txType,
      category_id: matchedCat || null,
      subcategory_id: null,
      transaction_date: date || new Date().toISOString().split("T")[0],
      payment_method: payMethod,
      description: desc.trim(),
      reference_number: "TX-" + Math.floor(100000 + Math.random() * 900000),
      is_recurring: isRecurring,
      is_duplicate: false,
      ai_confidence: suggestedCatName ? 0.95 : 0.85,
      notes: notes.trim() || null,
    });

    // Empty details immediately for clean slate
    setDesc("");
    setAmount("");
    setNotes("");
    setIsAddModalOpen(false);

    setActionSuccess(`Recorded "${desc.trim()}" (${formatINR(num)})! Dashboard metrics and charts updated.`);
    setTimeout(() => setActionSuccess(""), 4500);
  };

  const handleClearLedger = () => {
    clearTransactions();
    setShowClearConfirm(false);
    setActionSuccess("Ledger cleared! All transaction details are now empty. Ready to record your details.");
    setTimeout(() => setActionSuccess(""), 4500);
  };

  const handleLoadDemo = () => {
    resetToDemoData();
    setActionSuccess("Loaded sample Indian financial dataset with HDFC, ICICI, Swiggy, and Zomato records.");
    setTimeout(() => setActionSuccess(""), 4500);
  };

  // Filter transactions based on datePreset or customDate
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      if (datePreset === "custom" && customDate) {
        return t.transaction_date.split("T")[0] === customDate;
      }
      const d = new Date(t.transaction_date);
      if (datePreset === "today") {
        return d.toDateString() === now.toDateString();
      }
      if (datePreset === "this_week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return d >= startOfWeek;
      }
      if (datePreset === "this_month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (datePreset === "last_month") {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === year;
      }
      if (datePreset === "last_3_months") {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return d >= threeMonthsAgo;
      }
      if (datePreset === "this_year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, datePreset, customDate]);

  // Financial Metrics from Engine
  const income = useMemo(() => calculateIncome(filteredTransactions), [filteredTransactions]);
  const expenses = useMemo(() => calculateExpenses(filteredTransactions), [filteredTransactions]);
  const savings = useMemo(() => calculateSavings(income, expenses), [income, expenses]);
  const savingsRate = useMemo(() => calculateSavingsRate(savings, income), [savings, income]);

  const totalBalance = useMemo(() => {
    const assets = accounts
      .filter((a) => a.account_type !== "credit_card")
      .reduce((sum, a) => sum + a.balance, 0);
    const liabilities = accounts
      .filter((a) => a.account_type === "credit_card" && a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    return assets - liabilities;
  }, [accounts]);

  // Current Month Budget Adherence
  const currentBudget = budgets[0];
  const totalBudgetAmount = currentBudget ? currentBudget.total_amount : 50000;
  const budgetStatus = useMemo(
    () => calculateBudgetRemaining(totalBudgetAmount, expenses),
    [totalBudgetAmount, expenses]
  );

  // Chart Data 1: Category Totals
  const categoryTotals = useMemo(
    () => calculateCategoryTotals(filteredTransactions),
    [filteredTransactions]
  );

  // Chart Data 2: Monthly Trends
  const monthlyTrends = useMemo(
    () => calculateMonthlyTotals(transactions),
    [transactions]
  );

  // Chart Data 3: Top Spending Merchants
  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((t) => t.transaction_type === "expense")
      .forEach((t) => {
        const name = t.description.split("-")[0].trim();
        map.set(name, (map.get(name) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Chart Data 4: Budget vs Actual per Category
  const budgetVsActualData = useMemo(() => {
    if (!currentBudget || !currentBudget.budget_categories) return [];
    return currentBudget.budget_categories.map((bc) => {
      const actual = filteredTransactions
        .filter((t) => t.category_id === bc.category_id && t.transaction_type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        category: bc.category?.name || "Category",
        Budgeted: bc.amount,
        Actual: actual,
      };
    });
  }, [currentBudget, filteredTransactions]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast feedback */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-gray-400 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Banner with Greeting, Actions, and Timezone */}
      <div className="glass-card rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Tarun"}! 👋
            </h1>
            {transactions.length === 0 ? (
              <span className="px-2.5 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-full text-xs font-semibold">
                Clean Slate Mode (0 Details)
              </span>
            ) : isDemoMode ? (
              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold">
                Live Interactive Mode
              </span>
            ) : null}
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            FinSight AI Personal Finance Intelligence • Default Currency: INR (₹)
          </p>
        </div>

        {/* Action Controls & Date Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {/* Quick Add Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus size={15} />
            <span>Add Transaction</span>
          </button>

          {/* Voice Assistant Button */}
          <button
            onClick={() => openVoiceAssistant()}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer hover:scale-[1.02] ${
              isVoiceListening
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-950/40 animate-pulse"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/40"
            }`}
            title="Voice-to-financial-action assistant (Tap to Speak)"
          >
            <Mic size={15} className={isVoiceListening ? "animate-pulse text-red-200" : ""} />
            <span>Voice Assistant</span>
          </button>

          {/* Clear / Empty Details Button */}
          {transactions.length > 0 ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-red-950/50 text-gray-300 hover:text-red-300 border border-white/[0.08] hover:border-red-800/60 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Clear all transactions to start empty"
            >
              <Trash2 size={13} />
              <span>Empty Details</span>
            </button>
          ) : (
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Load sample Indian financial dataset"
            >
              <Sparkles size={13} />
              <span>Load Sample Data</span>
            </button>
          )}

          {/* Date Filter Tabs */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-1 gap-1 overflow-x-auto">
            {[
              { id: "today", label: "Today" },
              { id: "this_week", label: "Week" },
              { id: "this_month", label: "Month" },
              { id: "last_month", label: "Last Month" },
              { id: "last_3_months", label: "3M" },
              { id: "this_year", label: "Year" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDatePreset(tab.id as DateRangePreset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  datePreset === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Specific Date Picker Input */}
            <div className="flex items-center gap-1.5 pl-1.5 ml-0.5 border-l border-white/[0.08]">
              <Calendar size={13} className="text-blue-400 flex-shrink-0" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    setDatePreset("custom" as DateRangePreset);
                  }
                }}
                className="bg-black/40 border border-white/[0.1] rounded-lg px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                title="Search or inspect details for a specific date"
              />
              {customDate && (
                <button
                  onClick={() => {
                    setCustomDate("");
                    setDatePreset("this_month");
                  }}
                  className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Clear specific date"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Finance Assistant Hero Quick-Speak Banner */}
      <div className="glass-card rounded-2xl p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <Mic size={20} className="text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Voice Finance Assistant
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Safe Confirmed Writes
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Speak naturally:{" "}
              <button
                onClick={() => openVoiceAssistant("Add ₹500 for food")}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
              >
                “Add ₹500 for food”
              </button>{" "}
              •{" "}
              <button
                onClick={() => openVoiceAssistant("Spent 800 on groceries yesterday")}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
              >
                “Spent 800 on groceries yesterday”
              </button>{" "}
              •{" "}
              <button
                onClick={() => openVoiceAssistant("How much did I spend today?")}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
              >
                “How much did I spend today?”
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto flex-shrink-0 relative z-10">
          <button
            onClick={() => openVoiceAssistant()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Mic size={15} />
            <span>🎙️ Tap to Speak</span>
          </button>
        </div>
      </div>

      {/* Specific Date Details Inspection Banner */}
      {datePreset === "custom" && customDate && (
        <div className="p-4 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-gray-900 border border-blue-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm">
                  Showing Details for {formatDateWithDay(customDate)}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  {filteredTransactions.length} {filteredTransactions.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                Income on this day: <span className="text-emerald-400 font-semibold">{formatINR(income)}</span> •
                Expenses: <span className="text-rose-400 font-semibold">{formatINR(expenses)}</span> •
                Net Day Cashflow: <span className={`font-semibold ${savings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {savings >= 0 ? "+" : ""}{formatINR(savings)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddModal(customDate)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Plus size={13} />
              <span>Add on this Date</span>
            </button>
            <button
              onClick={() => {
                setCustomDate("");
                setDatePreset("this_month");
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              View Entire Month
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Emptying Ledger */}
      {showClearConfirm && (
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div>
            <h4 className="text-white text-sm font-semibold">Empty All Transaction Details?</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              This will clear all transactions so you can start with a completely empty ledger and record your own entries.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearLedger}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Yes, Empty Ledger
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hero Onboarding Card when 0 Transactions */}
      {transactions.length === 0 && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950/40 border border-blue-800/30 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Receipt size={28} />
          </div>
          <div className="max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Your Financial Ledger Is Empty</h2>
            <p className="text-gray-400 text-sm mt-1.5">
              Start by recording your own income and expenses below. Your cash flow, category breakdowns, savings rates, and predictions will automatically calculate in real time as you add details.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
            >
              <Plus size={16} />
              Add Your First Transaction
            </button>
            <Link
              to="/import"
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <FileText size={16} />
              Import Statement (CSV/Excel)
            </Link>
          </div>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="glass-card rounded-2xl p-5 hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Income</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-inner">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2.5 font-mono tracking-tight">{formatINR(income)}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-[11px]">
              <TrendingUp size={11} /> +100%
            </span>
            <span className="text-gray-400 text-[11px]">{filteredTransactions.filter((t) => t.transaction_type === "income").length} credits</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass-card rounded-2xl p-5 hover:border-rose-500/40 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Expenses</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center shadow-inner">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2.5 font-mono tracking-tight">{formatINR(expenses)}</p>
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/25 text-[11px]">
              <TrendingDown size={11} /> Outflow
            </span>
            <span className="text-gray-400 text-[11px]">{filteredTransactions.filter((t) => t.transaction_type === "expense").length} debits</span>
          </div>
        </div>

        {/* Net Savings & Rate */}
        <div className="glass-card rounded-2xl p-5 hover:border-blue-500/40 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Savings</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center shadow-inner">
              <PiggyBank size={16} />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold mt-2.5 font-mono tracking-tight ${savings >= 0 ? "text-white" : "text-rose-400"}`}>
            {formatINR(savings)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/25 text-[11px]">
              <Sparkles size={11} /> {savingsRate.toFixed(1)}%
            </span>
            <span className="text-gray-400 text-[11px]">{income > 0 ? "retention rate" : "Awaiting income"}</span>
          </div>
        </div>

        {/* Net Liquidity */}
        <div className="glass-card rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Liquidity</p>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shadow-inner">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2.5 font-mono tracking-tight">{formatINR(totalBalance)}</p>
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-[11px]">
              Active
            </span>
            <span className="text-gray-400 text-[11px]">{accounts.length} linked accounts</span>
          </div>
        </div>
      </div>

      {/* Row 2: Budget Progress Bar Card */}
      <div className="glass-card rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <PieChartIcon size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Monthly Budget Adherence</h3>
              <p className="text-[11px] text-gray-400">Target spending ceiling vs actual recorded ledger</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-400">Budget: <strong className="text-gray-200">{formatINR(totalBudgetAmount)}</strong></span>
            <span className="text-gray-400">Spent: <strong className="text-white">{formatINR(expenses)}</strong></span>
            <span className={`px-2.5 py-0.5 rounded-md border font-semibold ${
              budgetStatus.remaining >= 0 
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}>
              {budgetStatus.remaining >= 0 ? "Left: " : "Over: "}{formatINR(Math.abs(budgetStatus.remaining))}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/[0.06] h-2.5 rounded-full overflow-hidden mt-1 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 shadow-sm ${
              budgetStatus.usage_percentage >= 100
                ? "bg-rose-500 shadow-rose-500/50"
                : budgetStatus.usage_percentage >= 80
                ? "bg-amber-500 shadow-amber-500/50"
                : "bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-blue-500/40"
            }`}
            style={{ width: `${Math.min(budgetStatus.usage_percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2.5 font-medium">
          <span>Usage: <strong className="text-white font-mono">{budgetStatus.usage_percentage.toFixed(1)}%</strong> of limit</span>
          <span className="capitalize text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Status: {budgetStatus.status}
          </span>
        </div>
      </div>

      {/* Row 2.5: AI Document + Financial Intelligence (Upcoming Obligations & Sinking Fund) */}
      {documentObligations.length > 0 && (
        <div className="glass-card rounded-2xl p-5 shadow-md relative overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-gray-900/90 to-blue-950/30">
          <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    AI Document + Financial Intelligence
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Cross-Vault Synergy
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Automated financial extraction & sinking fund calculation from your encrypted Document Vault
                </p>
              </div>
            </div>

            <Link
              to="/documents"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors self-start md:self-auto cursor-pointer"
            >
              <span>Open Secure Vault</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 relative z-10">
            {documentObligations.map((obl) => (
              <div
                key={obl.documentId}
                className="p-4 rounded-xl bg-black/40 border border-white/[0.07] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                      {obl.obligationType}
                    </span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {obl.daysRemaining} days left
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5">{obl.documentName}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Due: <span className="text-gray-200 font-medium">{formatDate(obl.dueDate, "long")}</span>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Total Obligation:</span>
                    <span className="text-white font-mono font-bold">{formatINR(obl.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-300 font-medium">Recommended Sinking Fund:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {formatINR(obl.suggestedMonthlySaving)}/mo
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400">
                    Smooths lump-sum cash shock
                  </span>
                  <Link
                    to="/documents"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    View Policy <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section: 4 Core Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Income vs Expenses */}
        <div className="glass-card rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Income vs Expenses</h3>
              <p className="text-[11px] text-gray-400">Monthly cashflow overview</p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
              6-Month Trend
            </span>
          </div>
          <div className="h-64 w-full">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-950/40 rounded-xl border border-dashed border-gray-800 text-gray-500 text-xs">
                <BarChart className="w-8 h-8 text-gray-700 mb-2" />
                <p className="font-medium text-gray-400">No monthly transaction data</p>
                <p className="text-[11px] mt-0.5 text-gray-600">Add transactions to visualize your cashflow trend</p>
                <button
                  onClick={openAddModal}
                  className="mt-3 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  + Add Transaction
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(13, 16, 26, 0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255, 255, 255, 0.12)", borderRadius: "12px", boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.6)", fontSize: "12px", color: "#f8fafc" }}
                    formatter={(val: any) => formatINR(Number(val))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Category Expense Donut */}
        <div className="glass-card rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Expense Breakdown</h3>
              <p className="text-[11px] text-gray-400">Category spending distribution</p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
              Distribution
            </span>
          </div>
          <div className="h-64 w-full">
            {categoryTotals.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-950/40 rounded-xl border border-dashed border-gray-800 text-gray-500 text-xs">
                <PieChartIcon className="w-8 h-8 text-gray-700 mb-2" />
                <p className="font-medium text-gray-400">No expense categories to display</p>
                <p className="text-[11px] mt-0.5 text-gray-600">Categorized expenses will appear in this donut chart</p>
                <button
                  onClick={openAddModal}
                  className="mt-3 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  + Add Expense
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="total"
                    nameKey="category_name"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(13, 16, 26, 0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255, 255, 255, 0.12)", borderRadius: "12px", boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.6)", fontSize: "12px", color: "#f8fafc" }}
                    formatter={(val: any) => formatINR(Number(val))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Cash Flow (Cumulative) */}
        <div className="glass-card rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Monthly Net Savings</h3>
              <p className="text-[11px] text-gray-400">Net capital retention curve</p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
              Trajectory
            </span>
          </div>
          <div className="h-64 w-full">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-950/40 rounded-xl border border-dashed border-gray-800 text-gray-500 text-xs">
                <TrendingUp className="w-8 h-8 text-gray-700 mb-2" />
                <p className="font-medium text-gray-400">No savings trajectory yet</p>
                <p className="text-[11px] mt-0.5 text-gray-600">Savings = Income minus Expenses</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(13, 16, 26, 0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255, 255, 255, 0.12)", borderRadius: "12px", boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.6)", fontSize: "12px", color: "#f8fafc" }}
                    formatter={(val: any) => formatINR(Number(val))}
                  />
                  <Area type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#savingsGrad)" name="Net Savings" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Budget vs Actual Breakdown */}
        <div className="glass-card rounded-2xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Budget vs Actual</h3>
              <p className="text-[11px] text-gray-400">Allocated limit vs recorded reality</p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
              Limits vs Reality
            </span>
          </div>
          <div className="h-64 w-full">
            {filteredTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-950/40 rounded-xl border border-dashed border-gray-800 text-gray-500 text-xs">
                <BarChart className="w-8 h-8 text-gray-700 mb-2" />
                <p className="font-medium text-gray-400">No actual expenses against budget</p>
                <p className="text-[11px] mt-0.5 text-gray-600">Track how closely your spending matches allocations</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(13, 16, 26, 0.95)", backdropFilter: "blur(16px)", borderColor: "rgba(255, 255, 255, 0.12)", borderRadius: "12px", boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.6)", fontSize: "12px", color: "#f8fafc" }}
                    formatter={(val: any) => formatINR(Number(val))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Merchants + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Spending Merchants */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Top Merchants</h3>
              <p className="text-[11px] text-gray-400">Highest cumulative outflow</p>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-400 border border-white/[0.08]">
              Volume (₹)
            </span>
          </div>
          <div className="space-y-2.5">
            {topMerchants.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No merchant data yet</p>
            ) : (
              topMerchants.map((m, idx) => (
                <div key={m.name} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-white/[0.06] text-gray-400 font-mono font-bold flex items-center justify-center text-[10px] border border-white/[0.08]">
                      {idx + 1}
                    </span>
                    <span className="text-gray-200 font-medium">{m.name}</span>
                  </div>
                  <span className="text-white font-mono font-semibold">{formatINR(m.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions List (2 columns) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm tracking-tight">Recent Transactions</h3>
              <span className="text-xs text-gray-400 font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                {transactions.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openAddModal}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                Add
              </button>
              <Link
                to="/transactions"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <Receipt className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                No transactions recorded yet. Click "+ Add Transaction" above to begin.
              </div>
            ) : (
              transactions.slice(0, 6).map((tx) => {
                const isPositive = tx.transaction_type === "income" || tx.transaction_type === "refund";
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs hover:bg-white/[0.03] px-2.5 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm border ${
                          isPositive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.05] border-white/[0.08] text-gray-300"
                        }`}
                      >
                        <span>{tx.category?.icon || "💸"}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{tx.description}</p>
                        <div className="text-gray-400 text-[11px] mt-0.5 flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setCustomDate(tx.transaction_date.split("T")[0]);
                              setDatePreset("custom" as DateRangePreset);
                            }}
                            className="text-gray-400 hover:text-blue-400 font-mono hover:underline cursor-pointer"
                            title={`Filter dashboard to ${formatDate(tx.transaction_date, "short")}`}
                          >
                            {formatDate(tx.transaction_date, "short")}
                          </button>
                          <span>•</span>
                          <span>{tx.account?.name || "Account"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold font-mono text-xs ${isPositive ? "text-emerald-400" : "text-white"}`}>
                        {isPositive ? "+" : "-"}
                        {formatINR(tx.amount)}
                      </p>
                      <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {Math.round((tx.ai_confidence || 0.95) * 100)}% AI
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Add Transaction Details</h3>
                <p className="text-xs text-gray-400 mt-0.5">Enter details to update your real-time analytics</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="p-5 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setTxType("expense")}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    txType === "expense"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("income")}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    txType === "income"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Income (+)
                </button>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Description / Narration <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salary, Swiggy, Uber, Petrol, Rent, Groceries"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* AI Categorization Preview */}
              {suggestedCatName && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Sparkles size={14} className="text-blue-400" />
                    <span>AI Suggests: <strong>{suggestedCatName}</strong> (95%)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = categories.find((c) => c.name.toLowerCase() === suggestedCatName.toLowerCase());
                      if (matched) setCatId(matched.id);
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Account</label>
                  <select
                    value={accId}
                    onChange={(e) => setAccId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.length === 0 ? (
                      <option value="acc-default">Primary Account (₹0)</option>
                    ) : (
                      accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatINR(a.balance)})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Payment Method & Recurring */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="net_banking">Net Banking (NEFT / IMPS)</option>
                    <option value="cash">Cash</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                    <span>Recurring / Subscription</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional context or remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  Add Transaction Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
