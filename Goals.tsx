import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  PiggyBank,
} from "lucide-react";
import { useFinanceStore } from "../services/dataStore";
import { formatINR, formatDate } from "../utils/formatters";
import type { Goal, GoalStatus } from "../types";

const ICONS = ["🛡️", "💻", "🗾", "🚗", "🏡", "💍", "🎓", "📱", "✈️", "🚀"];

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinanceStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeDepositGoal, setActiveDepositGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("2027-03-31");
  const [selectedIcon, setSelectedIcon] = useState("🛡️");

  const openAddModal = () => {
    setEditingGoal(null);
    setName("");
    setDescription("");
    setTargetAmount("");
    setCurrentAmount("0");
    setTargetDate("2027-03-31");
    setSelectedIcon("🛡️");
    setIsModalOpen(true);
  };

  const openEditModal = (g: Goal) => {
    setEditingGoal(g);
    setName(g.name);
    setDescription(g.description || "");
    setTargetAmount(String(g.target_amount));
    setCurrentAmount(String(g.current_amount));
    setTargetDate(g.target_date);
    setSelectedIcon(g.icon || "🛡️");
    setIsModalOpen(true);
  };

  const openDepositModal = (g: Goal) => {
    setActiveDepositGoal(g);
    setDepositAmount("");
    setIsDepositModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(targetAmount) || 0;
    const numCurrent = parseFloat(currentAmount) || 0;
    const status: GoalStatus = numCurrent >= numTarget ? "completed" : "on_track";

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name,
        description: description || null,
        target_amount: numTarget,
        current_amount: numCurrent,
        target_date: targetDate,
        status,
        icon: selectedIcon,
      });
    } else {
      addGoal({
        user_id: "current-user",
        name,
        description: description || null,
        target_amount: numTarget,
        current_amount: numCurrent,
        currency: "INR",
        target_date: targetDate,
        status,
        icon: selectedIcon,
      });
    }
    setIsModalOpen(false);
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDepositGoal) return;
    const added = parseFloat(depositAmount) || 0;
    const newTotal = activeDepositGoal.current_amount + added;
    const newStatus: GoalStatus = newTotal >= activeDepositGoal.target_amount ? "completed" : "on_track";

    updateGoal(activeDepositGoal.id, {
      current_amount: newTotal,
      status: newStatus,
    });
    setIsDepositModalOpen(false);
  };

  // Summary Metrics
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalRemaining = totalTarget - totalSaved;

  // Monthly Required Math
  const calculateMonthlyRequired = (target: number, current: number, targetDateStr: string) => {
    const remaining = Math.max(0, target - current);
    if (remaining === 0) return 0;
    const now = new Date();
    const targetD = new Date(targetDateStr);
    const months = Math.max(
      1,
      (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth())
    );
    return Math.round(remaining / months);
  };

  const totalMonthlyRequired = goals.reduce(
    (sum, g) => sum + calculateMonthlyRequired(g.target_amount, g.current_amount, g.target_date),
    0
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Savings Goals</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track milestones, automate monthly targets and visualize your journey to financial freedom
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 w-fit"
        >
          <Plus size={18} />
          Create New Goal
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Goal Targets</p>
          <p className="text-2xl font-bold text-white mt-2">{formatINR(totalTarget)}</p>
          <p className="text-xs text-gray-500 mt-1">{goals.length} active financial goals</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Accumulated</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatINR(totalSaved)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}% achieved
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining to Save</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{formatINR(totalRemaining)}</p>
          <p className="text-xs text-gray-500 mt-1">Across all target timelines</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Required Monthly SIP</p>
          <p className="text-2xl font-bold text-purple-400 mt-2">{formatINR(totalMonthlyRequired)}/mo</p>
          <p className="text-xs text-gray-500 mt-1">To achieve all targets on time</p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
          const monthlyReq = calculateMonthlyRequired(g.target_amount, g.current_amount, g.target_date);
          const isCompleted = g.current_amount >= g.target_amount;

          return (
            <div
              key={g.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 hover:border-gray-700 transition-all shadow-md group relative"
            >
              {/* Header: Icon + Title + Actions */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl">
                    {g.icon || "🎯"}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{g.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{g.description || "Milestone"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(g)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Edit Goal"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete goal "${g.name}"?`)) deleteGoal(g.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Delete Goal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress and Target Amounts */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-gray-400">
                    Saved: <strong className="text-emerald-400 text-sm">{formatINR(g.current_amount)}</strong>
                  </span>
                  <span className="text-gray-400">
                    Target: <strong className="text-white text-sm">{formatINR(g.target_amount)}</strong>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      isCompleted
                        ? "bg-emerald-400"
                        : progress > 60
                        ? "bg-blue-500"
                        : "bg-purple-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                  <span className="font-semibold text-white">{progress.toFixed(1)}% Achieved</span>
                  <span>Target Date: {formatDate(g.target_date, "month_year")}</span>
                </div>
              </div>

              {/* Required Monthly Contribution & Deposit Button */}
              <div className="pt-3 border-t border-gray-800/70 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Monthly Contribution
                  </p>
                  <p className="text-xs font-bold text-purple-400 mt-0.5">
                    {isCompleted ? "Goal Reached! 🎉" : `${formatINR(monthlyReq)} / month`}
                  </p>
                </div>

                {!isCompleted && (
                  <button
                    onClick={() => openDepositModal(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 hover:border-transparent text-blue-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    <PiggyBank size={14} /> Add Funds
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h3 className="font-bold text-white text-base">
                {editingGoal ? "Edit Savings Goal" : "Create New Goal"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund, New Car, Tokyo Trip"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Choose Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setSelectedIcon(ic)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center border transition-all ${
                        selectedIcon === ic
                          ? "bg-blue-600/30 border-blue-500 scale-110"
                          : "bg-gray-800 border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Target Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 200000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Current Saved Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notes / Strategy (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Invest ₹10k monthly via recurring deposit"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  {editingGoal ? "Update Goal" : "Save Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Funds Modal */}
      {isDepositModalOpen && activeDepositGoal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h3 className="font-bold text-white text-base">Add Contribution to Goal</h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-gray-800/60 rounded-xl text-xs space-y-1">
              <p className="text-gray-400 font-semibold">{activeDepositGoal.name}</p>
              <p className="text-gray-200">
                Current: {formatINR(activeDepositGoal.current_amount)} / Target: {formatINR(activeDepositGoal.target_amount)}
              </p>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Contribution Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  Deposit Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
