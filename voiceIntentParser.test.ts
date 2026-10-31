// FinSight AI — Unit Tests for Voice Intent Parsing & Validation Layer
import { describe, it, expect } from "vitest";
import {
  extractAmount,
  extractDate,
  extractCategory,
  parseVoiceIntent,
} from "../services/voice/intentParser";
import {
  validateFinancialIntent,
  type ValidationContext,
} from "../services/voice/intentValidator";
import type { Category, Account, Transaction } from "../types";

const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Food", icon: "🍔", color: "#f97316", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-2", name: "Shopping", icon: "🛍️", color: "#8b5cf6", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-3", name: "Transportation", icon: "🚗", color: "#3b82f6", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-4", name: "Bills", icon: "📄", color: "#ef4444", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-9", name: "Groceries", icon: "🥦", color: "#84cc16", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-12", name: "Income", icon: "💰", color: "#14b8a6", is_system: true, user_id: null, created_at: "2026-01-01" },
  { id: "cat-13", name: "Other", icon: "📦", color: "#6b7280", is_system: true, user_id: null, created_at: "2026-01-01" },
];

const MOCK_ACCOUNTS: Account[] = [
  {
    id: "acc-1",
    user_id: "user",
    name: "HDFC Salary Account",
    account_type: "bank_account",
    institution: "HDFC Bank",
    balance: 50000,
    currency: "INR",
    is_active: true,
    credit_limit: null,
    billing_date: null,
    due_date: null,
    minimum_payment: null,
    created_at: "2026-01-01",
    updated_at: "2026-09-12",
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    user_id: "user",
    account_id: "acc-1",
    merchant_id: null,
    amount: 500,
    currency: "INR",
    transaction_type: "expense",
    category_id: "cat-1",
    subcategory_id: null,
    transaction_date: "2026-09-12",
    payment_method: "upi",
    description: "Lunch",
    reference_number: "REF-001",
    is_recurring: false,
    is_duplicate: false,
    ai_confidence: 0.95,
    notes: null,
    created_at: "2026-09-12T10:00:00Z",
    updated_at: "2026-09-12T10:00:00Z",
    category: MOCK_CATEGORIES[0],
  },
];

const mockContext: ValidationContext = {
  categories: MOCK_CATEGORIES,
  accounts: MOCK_ACCOUNTS,
  transactions: MOCK_TRANSACTIONS,
};

describe("Voice Intent Parser: Amount Extraction", () => {
  it("extracts standard Indian Rupee notation", () => {
    expect(extractAmount("Add ₹500 for food")).toBe(500);
    expect(extractAmount("Spent 350 rupees on lunch")).toBe(350);
    expect(extractAmount("Paid rs 1,200 for electricity")).toBe(1200);
    expect(extractAmount("Received ₹25,000 salary")).toBe(25000);
  });

  it("extracts Indian numbering abbreviations (k, lakh, crore)", () => {
    expect(extractAmount("Create a 50k goal")).toBe(50000);
    expect(extractAmount("Received 1.5 lakh bonus")).toBe(150000);
    expect(extractAmount("1 crore house goal")).toBe(10000000);
  });
});

describe("Voice Intent Parser: Date Extraction", () => {
  it("extracts relative dates correctly", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    expect(extractDate("Spent 500 today")).toBe(today);
    expect(extractDate("Spent 800 on groceries yesterday.")).toBe(yesterdayStr);
  });
});

describe("Voice Intent Parser: Category & Subcategory Extraction", () => {
  it("detects food and lunch", () => {
    const res = extractCategory("I spent 350 rupees on lunch");
    expect(res.category).toBe("Food");
    expect(res.subcategory).toBe("Lunch");
  });

  it("detects groceries", () => {
    const res = extractCategory("Spent 800 on groceries yesterday");
    expect(res.category).toBe("Groceries");
  });

  it("detects electricity bill", () => {
    const res = extractCategory("I paid 1,200 for electricity");
    expect(res.category).toBe("Bills");
    expect(res.subcategory).toBe("Electricity Bill");
  });

  it("detects transportation & Uber", () => {
    const res = extractCategory("Add 500 for Uber");
    expect(res.category).toBe("Transportation");
    expect(res.subcategory).toBe("Uber Cab");
  });

  it("detects income and salary", () => {
    const res = extractCategory("Received ₹25,000 salary");
    expect(res.category).toBe("Income");
    expect(res.subcategory).toBe("Monthly Salary");
  });
});

describe("Voice Intent Parser: Natural Language Commands", () => {
  it("parses: Add ₹500 food", () => {
    const intent = parseVoiceIntent("Add ₹500 food");
    expect(intent.action).toBe("add_transaction");
    expect(intent.type).toBe("expense");
    expect(intent.amount).toBe(500);
    expect(intent.category).toBe("Food");
  });

  it("parses: I spent 350 rupees on lunch", () => {
    const intent = parseVoiceIntent("I spent 350 rupees on lunch.");
    expect(intent.action).toBe("add_transaction");
    expect(intent.type).toBe("expense");
    expect(intent.amount).toBe(350);
    expect(intent.category).toBe("Food");
    expect(intent.subcategory).toBe("Lunch");
  });

  it("parses: Spent 800 on groceries yesterday", () => {
    const intent = parseVoiceIntent("Spent 800 on groceries yesterday.");
    expect(intent.action).toBe("add_transaction");
    expect(intent.type).toBe("expense");
    expect(intent.amount).toBe(800);
    expect(intent.category).toBe("Groceries");
  });

  it("parses: Received ₹25,000 salary", () => {
    const intent = parseVoiceIntent("Received ₹25,000 salary");
    expect(intent.action).toBe("add_transaction");
    expect(intent.type).toBe("income");
    expect(intent.amount).toBe(25000);
    expect(intent.category).toBe("Income");
  });

  it("parses: Delete the last transaction", () => {
    const intent = parseVoiceIntent("Delete the last transaction");
    expect(intent.action).toBe("delete_last_transaction");
  });

  it("parses: Remove that 500 food transaction", () => {
    const intent = parseVoiceIntent("Remove that 500 food transaction.");
    expect(intent.action).toBe("delete_specific_transaction");
    expect(intent.deleteTarget?.amount).toBe(500);
    expect(intent.deleteTarget?.category).toBe("Food");
  });

  it("parses: Set food budget to ₹6,000", () => {
    const intent = parseVoiceIntent("Set food budget to ₹6,000");
    expect(intent.action).toBe("update_budget");
    expect(intent.category).toBe("Food");
    expect(intent.amount).toBe(6000);
  });

  it("parses: Create a ₹50,000 laptop goal", () => {
    const intent = parseVoiceIntent("Create a ₹50,000 laptop goal");
    expect(intent.action).toBe("create_goal");
    expect(intent.targetAmount).toBe(50000);
    expect(intent.goalName?.toLowerCase()).toContain("laptop");
  });

  it("parses queries: How much did I spend today? & How much budget is left?", () => {
    const q1 = parseVoiceIntent("How much did I spend today?");
    expect(q1.action).toBe("query_spending");
    expect(q1.queryScope).toBe("today");

    const q2 = parseVoiceIntent("How much budget is left?");
    expect(q2.action).toBe("check_budget");
  });

  it("parses hands-free confirmation: Yes and Cancel", () => {
    expect(parseVoiceIntent("Yes").action).toBe("confirm");
    expect(parseVoiceIntent("Confirm").action).toBe("confirm");
    expect(parseVoiceIntent("Add it").action).toBe("confirm");
    expect(parseVoiceIntent("Cancel").action).toBe("cancel");
    expect(parseVoiceIntent("No").action).toBe("cancel");
  });
});

describe("Validation Layer: Guarding Database Writes", () => {
  it("approves valid transaction intent with sanitized payload", () => {
    const intent = parseVoiceIntent("Spent 500 on food");
    const validated = validateFinancialIntent(intent, mockContext);

    expect(validated.isValid).toBe(true);
    expect(validated.errors.length).toBe(0);
    expect(validated.sanitizedPayload?.transactionData?.amount).toBe(500);
    expect(validated.sanitizedPayload?.transactionData?.category_name).toBe("Food");
    expect(validated.sanitizedPayload?.transactionData?.account_id).toBe("acc-1");
  });

  it("rejects transaction intent with missing or non-positive amount", () => {
    const invalidIntent = {
      action: "add_transaction" as const,
      rawText: "spent some money on food",
      confidence: 0.5,
      category: "Food",
    };
    const validated = validateFinancialIntent(invalidIntent, mockContext);

    expect(validated.isValid).toBe(false);
    expect(validated.errors[0]).toContain("Invalid or missing transaction amount");
    expect(validated.sanitizedPayload).toBeUndefined();
  });

  it("rejects delete last transaction when ledger is empty", () => {
    const emptyContext: ValidationContext = {
      categories: MOCK_CATEGORIES,
      accounts: MOCK_ACCOUNTS,
      transactions: [],
    };
    const intent = parseVoiceIntent("Delete the last transaction");
    const validated = validateFinancialIntent(intent, emptyContext);

    expect(validated.isValid).toBe(false);
    expect(validated.errors[0]).toContain("empty");
  });

  it("validates and targets specific transaction for deletion", () => {
    const intent = parseVoiceIntent("Remove that 500 food transaction");
    const validated = validateFinancialIntent(intent, mockContext);

    expect(validated.isValid).toBe(true);
    expect(validated.sanitizedPayload?.targetTransactionId).toBe("tx-1");
  });
});
