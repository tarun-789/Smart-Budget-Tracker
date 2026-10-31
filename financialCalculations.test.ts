// FinSight AI - Financial Calculation Engine Tests
import { describe, it, expect } from "vitest";
import {
  calculateIncome, calculateExpenses, calculateSavings, calculateSavingsRate,
  calculateBudgetRemaining, calculateCashFlow, extractDocumentObligations,
} from "../services/financialCalculations";
import type { Transaction } from "../types";

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(), user_id: "user1", account_id: "acc1",
    merchant_id: null, amount: 100, currency: "INR",
    transaction_type: "expense", category_id: null, subcategory_id: null,
    transaction_date: "2026-09-01", payment_method: null, description: "Test",
    reference_number: null, is_recurring: false, is_duplicate: false,
    ai_confidence: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("calculateIncome", () => {
  it("sums income transactions only", () => {
    const txns = [makeTxn({ amount: 80000, transaction_type: "income" }), makeTxn({ amount: 5000, transaction_type: "expense" })];
    expect(calculateIncome(txns)).toBe(80000);
  });
  it("returns 0 when no income", () => {
    expect(calculateIncome([makeTxn({ transaction_type: "expense" })])).toBe(0);
  });
});

describe("calculateExpenses", () => {
  it("sums expense transactions and deducts refunds", () => {
    const txns = [
      makeTxn({ amount: 50000, transaction_type: "expense" }),
      makeTxn({ amount: 500, transaction_type: "refund" }),
    ];
    expect(calculateExpenses(txns)).toBe(49500);
  });
  it("does not include transfers or income", () => {
    const txns = [
      makeTxn({ amount: 80000, transaction_type: "income" }),
      makeTxn({ amount: 5000, transaction_type: "transfer" }),
    ];
    expect(calculateExpenses(txns)).toBe(0);
  });
  it("never returns negative", () => {
    const txns = [makeTxn({ amount: 200, transaction_type: "refund" })];
    expect(calculateExpenses(txns)).toBe(0);
  });
});

describe("calculateSavings", () => {
  it("computes savings correctly", () => {
    expect(calculateSavings(80000, 50000)).toBe(30000);
  });
  it("handles zero income", () => {
    expect(calculateSavings(0, 5000)).toBe(-5000);
  });
});

describe("calculateSavingsRate", () => {
  it("returns correct savings rate", () => {
    expect(calculateSavingsRate(30000, 80000)).toBeCloseTo(37.5, 2);
  });
  it("returns 0 for zero income", () => {
    expect(calculateSavingsRate(0, 0)).toBe(0);
  });
});

describe("calculateBudgetRemaining", () => {
  it("calculates remaining and usage correctly", () => {
    const result = calculateBudgetRemaining(8000, 5500);
    expect(result.remaining).toBe(2500);
    expect(result.usage_percentage).toBeCloseTo(68.75, 2);
    expect(result.status).toBe("healthy");
  });
  it("flags warning at 80%+", () => {
    const result = calculateBudgetRemaining(8000, 6500);
    expect(result.status).toBe("warning");
  });
  it("flags exceeded at 100%+", () => {
    const result = calculateBudgetRemaining(8000, 8500);
    expect(result.status).toBe("exceeded");
    expect(result.remaining).toBe(-500);
  });
});

describe("calculateCashFlow", () => {
  it("computes full cash flow summary", () => {
    const txns = [
      makeTxn({ amount: 80000, transaction_type: "income" }),
      makeTxn({ amount: 50000, transaction_type: "expense" }),
    ];
    const cf = calculateCashFlow(txns);
    expect(cf.income).toBe(80000);
    expect(cf.expenses).toBe(50000);
    expect(cf.savings).toBe(30000);
    expect(cf.savings_rate).toBeCloseTo(37.5, 2);
  });
});

describe("Edge cases", () => {
  it("handles empty transaction list", () => {
    expect(calculateIncome([])).toBe(0);
    expect(calculateExpenses([])).toBe(0);
    expect(calculateSavings(0, 0)).toBe(0);
    expect(calculateSavingsRate(0, 0)).toBe(0);
  });
  it("handles same-day multiple transactions", () => {
    const txns = [
      makeTxn({ amount: 500, transaction_type: "expense", transaction_date: "2026-09-01" }),
      makeTxn({ amount: 300, transaction_type: "expense", transaction_date: "2026-09-01" }),
    ];
    expect(calculateExpenses(txns)).toBe(800);
  });
});

describe("extractDocumentObligations", () => {
  it("extracts insurance premium and calculates sinking fund", () => {
    const docs = [
      {
        id: "doc-ins-1",
        name: "Health Insurance Policy",
        extracted_text: "STAR HEALTH Comprehensive Policy Sum Insured: ₹10,00,000 Valid Upto: 31/12/2026 Annual Premium Paid: ₹18,500",
        expiry_date: "2026-12-31",
      },
    ];

    const obligations = extractDocumentObligations(docs);
    expect(obligations).toHaveLength(1);
    expect(obligations[0].documentId).toBe("doc-ins-1");
    expect(obligations[0].obligationType).toBe("Insurance Renewal");
    expect(obligations[0].amount).toBe(18500);
    expect(obligations[0].dueDate).toBe("2026-12-31");
    expect(obligations[0].daysRemaining).toBeGreaterThan(0);
    expect(obligations[0].suggestedMonthlySaving).toBeGreaterThan(0);
  });

  it("skips documents without financial premium text or expiry date", () => {
    const docs = [
      {
        id: "doc-id-1",
        name: "Aadhaar Card",
        extracted_text: "UIDAI Aadhaar Card Name: John Doe",
        expiry_date: null,
      },
    ];

    const obligations = extractDocumentObligations(docs);
    expect(obligations).toHaveLength(0);
  });
});
