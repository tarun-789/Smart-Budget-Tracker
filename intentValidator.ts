// FinSight AI — Voice Financial Action Validation Layer
// Ensures structured JSON actions are verified against business rules BEFORE database execution.

import type { ParsedVoiceIntent } from "./intentParser";
import type { Account, Category, Transaction, TransactionType, PaymentMethod } from "../../types";

export interface ValidatedFinancialAction {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  intent: ParsedVoiceIntent;
  actionSummary?: string;
  userPrompt?: string;
  sanitizedPayload?: {
    action: ParsedVoiceIntent["action"];
    transactionData?: {
      amount: number;
      transaction_type: TransactionType;
      category_id: string;
      category_name: string;
      subcategory_name?: string;
      transaction_date: string;
      description: string;
      account_id: string;
      payment_method: PaymentMethod;
      notes?: string;
    };
    goalData?: {
      name: string;
      target_amount: number;
      target_date: string;
    };
    budgetData?: {
      category_id: string;
      category_name: string;
      amount: number;
    };
    targetTransactionId?: string;
  };
}

export interface ValidationContext {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
}

export function validateFinancialIntent(
  intent: ParsedVoiceIntent,
  context: ValidationContext
): ValidatedFinancialAction {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Pass through non-mutating actions
  if (
    intent.action === "confirm" ||
    intent.action === "cancel" ||
    intent.action === "query_spending" ||
    intent.action === "check_budget" ||
    intent.action === "filter_transactions"
  ) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      intent,
      sanitizedPayload: { action: intent.action },
    };
  }

  // 1. ADD TRANSACTION VALIDATION
  if (intent.action === "add_transaction") {
    // Check Amount
    if (intent.amount === undefined || isNaN(intent.amount) || intent.amount <= 0) {
      errors.push("Invalid or missing transaction amount. Please specify a positive number (e.g. ₹500).");
    } else if (intent.amount > 100_000_000) {
      errors.push("Amount exceeds single transaction threshold (₹10 Crore maximum).");
    }

    // Check Account
    const targetAccount =
      context.accounts.find((a) => a.is_active) || context.accounts[0];
    if (!targetAccount) {
      warnings.push("No active bank account found. A default account will be created.");
    }

    // Check Category Resolution
    const normalizedCategory = intent.category || "Other";
    const matchedCategory = context.categories.find(
      (c) => c.name.toLowerCase() === normalizedCategory.toLowerCase()
    );
    const categoryId = matchedCategory?.id || context.categories.find((c) => c.name === "Other")?.id || "cat-13";
    const categoryName = matchedCategory?.name || normalizedCategory;

    // Check Date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dateStr = intent.date && dateRegex.test(intent.date)
      ? intent.date
      : new Date().toISOString().split("T")[0];

    // Transaction Type
    const validTypes: TransactionType[] = ["expense", "income", "transfer", "refund", "investment"];
    const txType = validTypes.includes(intent.type as TransactionType)
      ? (intent.type as TransactionType)
      : "expense";

    // Payment Method
    const validPaymentMethods: PaymentMethod[] = ["upi", "credit_card", "debit_card", "cash", "net_banking", "wallet", "other"];
    const payMethod = validPaymentMethods.includes(intent.paymentMethod as PaymentMethod)
      ? (intent.paymentMethod as PaymentMethod)
      : "upi";

    const description = (intent.description || categoryName).trim().slice(0, 100);

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      intent,
      sanitizedPayload: isValid
        ? {
            action: "add_transaction",
            transactionData: {
              amount: intent.amount!,
              transaction_type: txType,
              category_id: categoryId,
              category_name: categoryName,
              subcategory_name: intent.subcategory,
              transaction_date: dateStr,
              description,
              account_id: targetAccount?.id || "acc-1",
              payment_method: payMethod,
              notes: `Recorded via Voice Assistant: "${intent.rawText}"`,
            },
          }
        : undefined,
    };
  }

  // 2. DELETE LAST TRANSACTION
  if (intent.action === "delete_last_transaction") {
    if (context.transactions.length === 0) {
      errors.push("Cannot delete: Your transaction ledger is currently empty.");
      return { isValid: false, errors, warnings, intent };
    }

    const lastTx = context.transactions[0];
    return {
      isValid: true,
      errors: [],
      warnings: [],
      intent,
      sanitizedPayload: {
        action: "delete_last_transaction",
        targetTransactionId: lastTx.id,
      },
    };
  }

  // 3. DELETE SPECIFIC TRANSACTION
  if (intent.action === "delete_specific_transaction") {
    if (context.transactions.length === 0) {
      errors.push("Cannot delete: No transactions recorded in ledger.");
      return { isValid: false, errors, warnings, intent };
    }

    const target = intent.deleteTarget;
    const match = context.transactions.find((t) => {
      let isMatch = true;
      if (target?.amount && Math.abs(t.amount - target.amount) > 1) {
        isMatch = false;
      }
      if (target?.category && t.category?.name.toLowerCase() !== target.category.toLowerCase()) {
        isMatch = false;
      }
      return isMatch;
    });

    if (!match) {
      errors.push(
        `Could not find a matching transaction for ${target?.amount ? `₹${target.amount}` : ""} ${target?.category || ""}.`
      );
      return { isValid: false, errors, warnings, intent };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
      intent,
      sanitizedPayload: {
        action: "delete_specific_transaction",
        targetTransactionId: match.id,
      },
    };
  }

  // 4. CREATE GOAL
  if (intent.action === "create_goal") {
    if (!intent.targetAmount || intent.targetAmount <= 0) {
      errors.push("Invalid goal amount. Please specify a positive savings target (e.g. ₹50,000).");
    }

    const goalName = (intent.goalName || "Savings Goal").trim();
    if (!goalName) {
      errors.push("Goal name cannot be empty.");
    }

    const isValid = errors.length === 0;

    // Target 6 months from now by default
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 6);

    return {
      isValid,
      errors,
      warnings,
      intent,
      sanitizedPayload: isValid
        ? {
            action: "create_goal",
            goalData: {
              name: goalName,
              target_amount: intent.targetAmount!,
              target_date: targetDate.toISOString().split("T")[0],
            },
          }
        : undefined,
    };
  }

  // 5. UPDATE BUDGET
  if (intent.action === "update_budget") {
    if (intent.amount === undefined || intent.amount < 0) {
      errors.push("Budget amount must be a non-negative number.");
    }

    const cat = context.categories.find(
      (c) => c.name.toLowerCase() === (intent.category || "").toLowerCase()
    );
    const categoryId = cat?.id || "cat-1";
    const categoryName = cat?.name || intent.category || "General";

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      intent,
      sanitizedPayload: isValid
        ? {
            action: "update_budget",
            budgetData: {
              category_id: categoryId,
              category_name: categoryName,
              amount: intent.amount ?? 5000,
            },
          }
        : undefined,
    };
  }

  return {
    isValid: false,
    errors: ["Unrecognized voice action format."],
    warnings: [],
    intent,
  };
}
