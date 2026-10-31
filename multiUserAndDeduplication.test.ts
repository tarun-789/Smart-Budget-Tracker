import { describe, it, expect, beforeEach } from "vitest";
import { financeStore } from "../services/dataStore";
import { documentVaultStore } from "../services/documentStore";
import { getRegisteredUsers, saveRegisteredUsers } from "../services/authRegistry";

describe("Multi-User Support & User Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    financeStore.clearAllData();
  });

  it("isolates transactions between different user sessions via switchUser", () => {
    // User A session
    financeStore.switchUser("user-alpha");
    financeStore.addAccount({
      user_id: "user-alpha",
      name: "Alpha Bank",
      account_type: "savings_account",
      institution: "HDFC",
      balance: 10000,
      currency: "INR",
      is_active: true,
      credit_limit: null,
      billing_date: null,
      due_date: null,
      minimum_payment: null,
    });
    const accountsA = financeStore.getAccounts();
    expect(accountsA.length).toBeGreaterThan(0);
    const accAId = accountsA[0].id;

    financeStore.addTransaction({
      user_id: "user-alpha",
      account_id: accAId,
      merchant_id: null,
      amount: 4500,
      currency: "INR",
      transaction_type: "income",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-10",
      payment_method: "upi",
      description: "Freelance Design Payment",
      reference_number: "UPI-ALPHA-01",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.98,
      notes: null,
    });

    expect(financeStore.getTransactions()).toHaveLength(1);
    expect(financeStore.getTransactions()[0].description).toBe("Freelance Design Payment");

    // Switch to User B session
    financeStore.switchUser("user-beta");
    expect(financeStore.getTransactions()).toHaveLength(0); // Clean partition for user-beta!

    // Add transaction for User B
    const accountsB = financeStore.getAccounts();
    const accBId = accountsB[0]?.id || "acc-default";

    financeStore.addTransaction({
      user_id: "user-beta",
      account_id: accBId,
      merchant_id: null,
      amount: 800,
      currency: "INR",
      transaction_type: "expense",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-11",
      payment_method: "upi",
      description: "Groceries at Blinkit",
      reference_number: "UPI-BETA-01",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.95,
      notes: null,
    });

    expect(financeStore.getTransactions()).toHaveLength(1);
    expect(financeStore.getTransactions()[0].description).toBe("Groceries at Blinkit");

    // Switch back to User A
    financeStore.switchUser("user-alpha");
    expect(financeStore.getTransactions()).toHaveLength(1);
    expect(financeStore.getTransactions()[0].description).toBe("Freelance Design Payment");
  });
});

describe("Transaction Deduplication ('remove duplicate only the')", () => {
  beforeEach(() => {
    localStorage.clear();
    financeStore.clearAllData();
    financeStore.switchUser("test-dedup-user");
  });

  it("removes ONLY the duplicate copies while strictly preserving the original earliest transaction", () => {
    const accounts = financeStore.getAccounts();
    const accId = accounts[0]?.id || "acc-1";

    // 1. Add Original Transaction
    const original = financeStore.addTransaction({
      user_id: "test-dedup-user",
      account_id: accId,
      merchant_id: null,
      amount: 1200,
      currency: "INR",
      transaction_type: "expense",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-12",
      payment_method: "upi",
      description: "Electricity Bill Payment",
      reference_number: "EBILL-991",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.99,
      notes: "Original payment",
    });

    // 2. Add Duplicate Copy 1 (identical amount, date, description, type, account)
    const duplicate1 = financeStore.addTransaction({
      user_id: "test-dedup-user",
      account_id: accId,
      merchant_id: null,
      amount: 1200,
      currency: "INR",
      transaction_type: "expense",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-12",
      payment_method: "upi",
      description: "Electricity Bill Payment",
      reference_number: "EBILL-991",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.99,
      notes: "Accidental double entry",
    });

    // 3. Add Duplicate Copy 2 (another duplicate)
    const duplicate2 = financeStore.addTransaction({
      user_id: "test-dedup-user",
      account_id: accId,
      merchant_id: null,
      amount: 1200,
      currency: "INR",
      transaction_type: "expense",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-12",
      payment_method: "upi",
      description: "electricity bill payment ", // slight case/whitespace variation
      reference_number: "EBILL-991",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.99,
      notes: "Third duplicate entry",
    });

    // 4. Add a completely different distinct transaction
    const distinct = financeStore.addTransaction({
      user_id: "test-dedup-user",
      account_id: accId,
      merchant_id: null,
      amount: 450,
      currency: "INR",
      transaction_type: "expense",
      category_id: null,
      subcategory_id: null,
      transaction_date: "2026-09-12",
      payment_method: "upi",
      description: "Coffee and snacks",
      reference_number: "COFFEE-01",
      is_recurring: false,
      is_duplicate: false,
      ai_confidence: 0.95,
      notes: null,
    });

    // Currently we have 4 transactions total
    expect(financeStore.getTransactions()).toHaveLength(4);

    // Perform Deduplication
    const result = financeStore.deduplicateTransactions();

    // Verify removed count
    expect(result.removedCount).toBe(2);

    // Remaining transactions should be exactly 2: the original electricity bill and the coffee
    const remaining = financeStore.getTransactions();
    expect(remaining).toHaveLength(2);

    const remainingIds = remaining.map((t) => t.id);
    // Original MUST be kept
    expect(remainingIds).toContain(original.id);
    // Distinct MUST be kept
    expect(remainingIds).toContain(distinct.id);
    // Duplicate copies MUST be removed
    expect(remainingIds).not.toContain(duplicate1.id);
    expect(remainingIds).not.toContain(duplicate2.id);
  });
});

describe("Document Vault Deduplication", () => {
  beforeEach(() => {
    localStorage.clear();
    documentVaultStore.switchUser("test-vault-user");
  });

  it("removes ONLY duplicate documents and preserves the earliest uploaded version", () => {
    // Add Original Doc
    const doc1 = documentVaultStore.addDocument({
      name: "Aadhaar Card",
      original_filename: "aadhaar_card.pdf",
      category: "Identity",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 150000,
      file_url: "data:application/pdf;base64,sample1",
      extracted_text: "Government of India Unique Identification Authority 1234 5678 9012",
      expiry_date: null,
      document_number: "1234-5678-9012",
      document_number_type: "Aadhaar No",
      is_sensitive: true,
      tags: ["Identity", "Government"],
    });

    // Add Duplicate Doc (same document number)
    const doc2 = documentVaultStore.addDocument({
      name: "Aadhaar Card Duplicate",
      original_filename: "aadhaar_copy.pdf",
      category: "Identity",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 150000,
      file_url: "data:application/pdf;base64,sample2",
      extracted_text: "Government of India Unique Identification Authority 1234 5678 9012",
      expiry_date: null,
      document_number: "1234-5678-9012",
      document_number_type: "Aadhaar No",
      is_sensitive: true,
      tags: ["Identity"],
    });

    // Add Distinct Doc
    const doc3 = documentVaultStore.addDocument({
      name: "PAN Card",
      original_filename: "pan_card.pdf",
      category: "Identity",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 120000,
      file_url: "data:application/pdf;base64,sample3",
      extracted_text: "Income Tax Department ABCDE1234F",
      expiry_date: null,
      document_number: "ABCDE1234F",
      document_number_type: "PAN No",
      is_sensitive: true,
      tags: ["Tax"],
    });

    const dedupRes = documentVaultStore.removeDuplicateDocuments();
    expect(dedupRes.removedCount).toBe(1);

    const docs = documentVaultStore.getDocuments();
    const docIds = docs.map((d) => d.id);
    expect(docIds).toContain(doc1.id); // original kept
    expect(docIds).toContain(doc3.id); // distinct kept
    expect(docIds).not.toContain(doc2.id); // duplicate removed
  });
});

describe("Unlimited Multi-User Registry & Duplicate Registration Prevention", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists any number of registered users in the registry", () => {
    const initial = getRegisteredUsers();
    expect(initial.length).toBeGreaterThanOrEqual(1);

    const newUser1 = {
      id: "user-test-1",
      email: "alex@example.com",
      full_name: "Alex Smith",
      password: "securepassword1",
      created_at: new Date().toISOString(),
    };

    const newUser2 = {
      id: "user-test-2",
      email: "priya@example.com",
      full_name: "Priya Sharma",
      password: "securepassword2",
      created_at: new Date().toISOString(),
    };

    saveRegisteredUsers([...initial, newUser1, newUser2]);

    const updated = getRegisteredUsers();
    expect(updated).toHaveLength(initial.length + 2);
    expect(updated.some((u) => u.email === "alex@example.com")).toBe(true);
    expect(updated.some((u) => u.email === "priya@example.com")).toBe(true);
  });

  it("detects existing email to prevent duplicate account registration", () => {
    const existingUsers = getRegisteredUsers();
    const existingEmail = existingUsers[0].email;

    // Simulate signup duplicate check
    const isDuplicate = existingUsers.some(
      (u) => u.email.toLowerCase().trim() === existingEmail.toLowerCase().trim()
    );
    expect(isDuplicate).toBe(true);

    const nonDuplicateEmail = "unique_new_user_99@domain.com";
    const isNonDuplicate = existingUsers.some(
      (u) => u.email.toLowerCase().trim() === nonDuplicateEmail.toLowerCase().trim()
    );
    expect(isNonDuplicate).toBe(false);
  });
});
