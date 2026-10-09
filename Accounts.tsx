
import React, { useState } from "react";
import {
  Wallet,
  Building2,
  CreditCard,
  Smartphone,
  TrendingUp,
  Banknote,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

import { EmptyState } from "../components/ui/EmptyState";
import { useFinanceStore } from "../services/dataStore";
import {
  formatINR,
  formatAccountType,
} from "../utils/formatters";
import type { Account, AccountType } from "../types";

const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "bank_account", label: "Bank Account", icon: Building2 },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "digital_wallet", label: "Digital Wallet", icon: Smartphone },
  { value: "investment", label: "Investment", icon: TrendingUp },
];

const DEFAULT_FORM = {
  name: "",
  accountType: "bank_account" as AccountType,
  institution: "",
  balance: "",
  creditLimit: "",
  billingDate: "15",
  dueDate: "5",
};

export default function Accounts() {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Account | null>(null);

  const resetForm = () => {
    setForm({ ...DEFAULT_FORM });
    setEditingAccount(null);
    setError("");
    setSuccess("");
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setError("");
    setSuccess("");

    setForm({
      name: account.name ?? "",
      accountType: account.account_type,
      institution: account.institution ?? "",
      balance: String(account.balance ?? 0),
      creditLimit: String(
        (account as Account & { credit_limit?: number }).credit_limit ?? ""
      ),
      billingDate: String(
        (account as Account & { billing_date?: number }).billing_date ?? 15
      ),
      dueDate: String(
        (account as Account & { due_date?: number }).due_date ?? 5
      ),
    });

    setIsModalOpen(true);
  };

  const updateField = (
    field: keyof typeof DEFAULT_FORM,
    value: string
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();

    if (!name) {
      setError("Please enter an account name.");
      return;
    }

    const balance = Number(form.balance || 0);
    const creditLimit = Number(form.creditLimit || 0);
    const billingDate = Number(form.billingDate);
    const dueDate = Number(form.dueDate);

    if (!Number.isFinite(balance)) {
      setError("Please enter a valid balance.");
      return;
    }

    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      setError("Please enter a valid credit limit.");
      return;
    }

    if (
      !Number.isInteger(billingDate) ||
      billingDate < 1 ||
      billingDate > 31
    ) {
      setError("Billing date must be between 1 and 31.");
      return;
    }

    if (
      !Number.isInteger(dueDate) ||
      dueDate < 1 ||
      dueDate > 31
    ) {
      setError("Due date must be between 1 and 31.");
      return;
    }

    setLoading(true);

    try {
      const accountData = {
        name,
        account_type: form.accountType,
        institution: form.institution.trim(),
        balance,
        credit_limit: creditLimit,
        billing_date: billingDate,
        due_date: dueDate,
      };

      if (editingAccount) {
        await updateAccount(
          editingAccount.id,
          accountData
        );
        setSuccess("Account updated successfully.");
      } else {
        await addAccount(accountData);
        setSuccess("Account added successfully.");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    setError("");

    try {
      await deleteAccount(deleteTarget.id);
      setSuccess("Account deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete the account."
      );
      setDeleteTarget(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = ACCOUNT_TYPES.find(
    (type) => type.value === form.accountType
  );
  const SelectedIcon = selectedType?.icon ?? Wallet;

  return (
    <main className="min-h-screen bg-gray-950 p-4 sm:p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Accounts</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your bank accounts, cards and wallets.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={18} />
            Add Account
          </button>
        </header>

        {/* Feedback */}
        {success && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 p-3 rounded-lg border border-emerald-700/50 bg-emerald-950/40 text-emerald-300 text-sm"
          >
            <CheckCircle2 size={18} />
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && !isModalOpen && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg border border-red-700/50 bg-red-950/40 text-red-300 text-sm"
          >
            {error}
          </div>
        )}

        {/* Account list */}
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No accounts yet"
            description="Add your first account to start tracking your finances."
            action={
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
              >
                Add Account
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const typeInfo = ACCOUNT_TYPES.find(
                  (type) => type.value === account.account_type
                );
                const AccountIcon = typeInfo?.icon ?? Wallet;

                return (
                  <article
                    key={account.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-3 rounded-xl bg-blue-600/15 text-blue-400">
                          <AccountIcon size={22} />
                        </div>

                        <div className="min-w-0">
                          <h2 className="font-semibold truncate">
                            {account.name}
                          </h2>
                          <p className="text-gray-400 text-sm">
                            {formatAccountType(account.account_type)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(account)}
                          aria-label={`Edit ${account.name}`}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg"
                        >
                          <Edit2 size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(account)}
                          aria-label={`Delete ${account.name}`}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    {account.institution && (
                      <p className="text-sm text-gray-400 mt-4">
                        {account.institution}
                      </p>
                    )}

                    <div className="mt-5 pt-4 border-t border-gray-800">
                      <p className="text-xs text-gray-500">
                        {account.account_type === "credit_card"
                          ? "Outstanding balance"
                          : "Current balance"}
                      </p>

                      <p className="text-2xl font-bold mt-1">
                        {formatINR(account.balance)}
                      </p>

                      {account.account_type === "credit_card" && (
                        <p className="text-xs text-gray-500 mt-2">
                          Credit limit:{" "}
                          {formatINR(
                            (account as Account & {
                              credit_limit?: number;
                            }).credit_limit ?? 0
                          )}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <p className="text-sm text-gray-400">
                Total account balance
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatINR(
                  accounts.reduce(
                    (total, account) =>
                      total + Number(account.balance || 0),
                    0
                  )
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This total adds every account balance, including credit
                card balances. It is not necessarily your net worth.
              </p>
            </div>
          </>
        )}

        {/* Add/Edit modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !loading) {
                setIsModalOpen(false);
                resetForm();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="account-modal-title"
              className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6 my-auto"
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600/15 text-blue-400">
                    <SelectedIcon size={22} />
                  </div>

                  <div>
                    <h2
                      id="account-modal-title"
                      className="text-xl font-bold"
                    >
                      {editingAccount ? "Edit Account" : "Add Account"}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Enter your account details below.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={loading}
                  aria-label="Close modal"
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg border border-red-700/50 bg-red-950/40 p-3 text-sm text-red-300"
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="account-name"
                    className="block text-sm text-gray-300 mb-2"
                  >
                    Account name *
                  </label>
                  <input
                    id="account-name"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    maxLength={100}
                    placeholder="e.g. Salary Account"
                    disabled={loading}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="account-type"
                    className="block text-sm text-gray-300 mb-2"
                  >
                    Account type *
                  </label>
                  <select
                    id="account-type"
                    value={form.accountType}
                    onChange={(event) =>
                      updateField(
                        "accountType",
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="institution"
                    className="block text-sm text-gray-300 mb-2"
                  >
                    Bank or institution
                  </label>
                  <input
                    id="institution"
                    value={form.institution}
                    onChange={(event) =>
                      updateField("institution", event.target.value)
                    }
                    maxLength={100}
                    placeholder="e.g. SBI, HDFC, Google Pay"
                    disabled={loading}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="balance"
                    className="block text-sm text-gray-300 mb-2"
                  >
                    {form.accountType === "credit_card"
                      ? "Outstanding balance (₹)"
                      : "Current balance (₹)"}
                  </label>
                  <input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(event) =>
                      updateField("balance", event.target.value)
                    }
                    required
                    disabled={loading}
                    placeholder="0.00"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                {form.accountType === "credit_card" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="credit-limit"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Credit limit (₹)
                      </label>
                      <input
                        id="credit-limit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.creditLimit}
                        onChange={(event) =>
                          updateField("creditLimit", event.target.value)
                        }
                        disabled={loading}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="billing-date"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Billing day
                      </label>
                      <input
                        id="billing-date"
                        type="number"
                        min="1"
                        max="31"
                        value={form.billingDate}
                        onChange={(event) =>
                          updateField("billingDate", event.target.value)
                        }
                        disabled={loading}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="due-date"
                        className="block text-sm text-gray-300 mb-2"
                      >
                        Payment due day
                      </label>
                      <input
                        id="due-date"
                        type="number"
                        min="1"
                        max="31"
                        value={form.dueDate}
                        onChange={(event) =>
                          updateField("dueDate", event.target.value)
                        }
                        disabled={loading}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-3 border border-gray-700 hover:bg-gray-800 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? (
                      "Saving..."
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        {editingAccount ? "Save Changes" : "Add Account"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                  <AlertTriangle size={22} />
                </div>
                <h2 id="delete-title" className="text-lg font-bold">
                  Delete Account?
                </h2>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete{" "}
                <strong className="text-white">
                  {deleteTarget.name}
                </strong>
                ? This action may not be reversible.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-gray-700 hover:bg-gray-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
