// FinSight AI — Unit Tests for Secure Personal Document Vault & OCR Engine
import { describe, it, expect } from "vitest";
import {
  calculateExpiryStatus,
  extractExpiryDateFromText,
  processDocumentOCR,
  matchesDocumentQuery,
} from "../services/ocrService";
import { documentVaultStore } from "../services/documentStore";
import { parseVoiceIntent } from "../services/voice/intentParser";

describe("Document Vault: Expiry Date Extraction & Calculation", () => {
  it("calculates status for expired, expires_soon, and valid dates", () => {
    // Expired
    const past = new Date();
    past.setMonth(past.getMonth() - 2);
    const pastStr = past.toISOString().split("T")[0];
    const expResult = calculateExpiryStatus(pastStr);
    expect(expResult.status).toBe("expired");
    expect(expResult.daysRemaining).toBeLessThan(0);

    // Expires soon (within 60 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 45);
    const soonStr = soon.toISOString().split("T")[0];
    const soonResult = calculateExpiryStatus(soonStr);
    expect(soonResult.status).toBe("expires_soon");
    expect(soonResult.daysRemaining).toBeGreaterThan(0);
    expect(soonResult.daysRemaining).toBeLessThanOrEqual(180);

    // Valid far future (e.g. 2 years)
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const futureStr = future.toISOString().split("T")[0];
    const validResult = calculateExpiryStatus(futureStr);
    expect(validResult.status).toBe("valid");
    expect(validResult.daysRemaining).toBeGreaterThan(180);

    // Null date
    const nullResult = calculateExpiryStatus(null);
    expect(nullResult.status).toBe("not_applicable");
    expect(nullResult.daysRemaining).toBeNull();
  });

  it("extracts expiry dates from various textual patterns", () => {
    expect(extractExpiryDateFromText("Driving Licence Valid Upto: 15/03/2027")).toBe("2027-03-15");
    expect(extractExpiryDateFromText("Policy Expiry Date: 31-12-2026")).toBe("2026-12-31");
    expect(extractExpiryDateFromText("Expires on 14 Aug 2028")).toBe("2028-08-14");
    expect(extractExpiryDateFromText("Permanent Document without expiry")).toBeNull();
  });
});

describe("Document Vault: OCR & Auto-Categorization", () => {
  it("auto-suggests Aadhaar Card & Identity category from UIDAI text", async () => {
    const file = new File(["dummy content"], "IMG_8291.pdf", { type: "application/pdf" });
    const text = "GOVERNMENT OF INDIA UNIQUE IDENTIFICATION AUTHORITY OF INDIA UIDAI 9845 2314 7890";
    const res = await processDocumentOCR(file, text);

    expect(res.suggestedName).toBe("Aadhaar Card");
    expect(res.suggestedCategory).toBe("Identity");
    expect(res.isSensitive).toBe(true);
  });

  it("auto-suggests Degree Certificate & Education category from degree text", async () => {
    const file = new File(["dummy"], "Degree_Final.pdf", { type: "application/pdf" });
    const text = "ABC University Bachelor of Technology in Computer Science and Engineering";
    const res = await processDocumentOCR(file, text);

    expect(res.suggestedName).toBe("Degree Certificate");
    expect(res.suggestedCategory).toBe("Education");
  });

  it("detects expiry date on Driving Licence scan", async () => {
    const file = new File(["dummy"], "DL_Scan.jpg", { type: "image/jpeg" });
    const text = "TRANSPORT DEPARTMENT DRIVING LICENCE DL No: KA-01-2021 Valid Upto: 15/03/2027";
    const res = await processDocumentOCR(file, text);

    expect(res.suggestedName).toBe("Driving Licence");
    expect(res.suggestedCategory).toBe("Identity");
    expect(res.detectedExpiryDate).toBe("2027-03-15");
  });
});

describe("Document Vault: Smart Search & OCR Deep Search", () => {
  const testDoc = {
    name: "B.Tech Degree Certificate",
    original_filename: "certificate_final.pdf",
    category: "Education",
    tags: ["University", "Academics"],
    extracted_text: "ABC University Bachelor of Technology in Computer Science Class of 2026",
  };

  it("matches exact name and category", () => {
    expect(matchesDocumentQuery(testDoc, "Degree")).toBe(true);
    expect(matchesDocumentQuery(testDoc, "Education")).toBe(true);
  });

  it("performs OCR deep full-text search inside document body", () => {
    // "ABC University" is NOT in the name or filename, ONLY in extracted_text!
    expect(matchesDocumentQuery(testDoc, "ABC University")).toBe(true);
    expect(matchesDocumentQuery(testDoc, "Computer Science")).toBe(true);
  });

  it("matches aliases and spelling variations (Aadhaar / Aadhar)", () => {
    const aadhaarDoc = {
      name: "Aadhaar Card",
      original_filename: "IMG_8291.pdf",
      category: "Identity",
      extracted_text: "UIDAI Government of India",
    };

    // User types "Aadhar" (without double 'a')
    expect(matchesDocumentQuery(aadhaarDoc, "Aadhar")).toBe(true);
    // User types "UIDAI"
    expect(matchesDocumentQuery(aadhaarDoc, "UIDAI")).toBe(true);
  });
});

describe("Document Vault Store: Lifecycle, Versioning & Trash", () => {
  it("adds a document and keeps it in the active vault", () => {
    const newDoc = documentVaultStore.addDocument({
      user_id: "user",
      name: "PAN Card",
      original_filename: "PAN_Scan.pdf",
      category: "Identity",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 250000,
      file_url: "data:application/pdf;base64,dummy",
      extracted_text: "INCOME TAX DEPARTMENT GOVT OF INDIA",
      expiry_date: null,
      is_sensitive: true,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: ["Tax", "Identity"],
    });

    expect(newDoc.id).toBeDefined();
    const retrieved = documentVaultStore.getDocumentById(newDoc.id);
    expect(retrieved?.name).toBe("PAN Card");
    expect(retrieved?.category).toBe("Identity");
  });

  it("renames and moves document category", () => {
    const doc = documentVaultStore.addDocument({
      user_id: "user",
      name: "Old Document Name",
      original_filename: "doc.pdf",
      category: "Personal",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 100000,
      file_url: "data:application/pdf;base64,dummy",
      extracted_text: "Test content",
      expiry_date: null,
      is_sensitive: false,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: [],
    });

    documentVaultStore.renameDocument(doc.id, "Renamed Aadhaar Proof");
    expect(documentVaultStore.getDocumentById(doc.id)?.name).toBe("Renamed Aadhaar Proof");

    documentVaultStore.moveCategory(doc.id, "Identity");
    expect(documentVaultStore.getDocumentById(doc.id)?.category).toBe("Identity");
  });

  it("moves to trash (soft delete) and restores document", () => {
    const doc = documentVaultStore.addDocument({
      user_id: "user",
      name: "Temporary Marksheet",
      original_filename: "temp.pdf",
      category: "Education",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 50000,
      file_url: "data:application/pdf;base64,dummy",
      extracted_text: "Marks",
      expiry_date: null,
      is_sensitive: false,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: [],
    });

    // Move to trash
    documentVaultStore.moveToTrash(doc.id);
    const inTrash = documentVaultStore.getDocumentById(doc.id);
    expect(inTrash?.is_trash).toBe(true);
    expect(inTrash?.deleted_at).toBeDefined();

    // Active documents should NOT include this document
    const activeDocs = documentVaultStore.getDocuments();
    expect(activeDocs.some((d) => d.id === doc.id)).toBe(false);

    // Trash documents should include this document
    const trashDocs = documentVaultStore.getDocuments({ category: "Trash" });
    expect(trashDocs.some((d) => d.id === doc.id)).toBe(true);

    // Restore from trash
    documentVaultStore.restoreFromTrash(doc.id);
    const restored = documentVaultStore.getDocumentById(doc.id);
    expect(restored?.is_trash).toBe(false);
    expect(restored?.deleted_at).toBeNull();
  });

  it("supports document version replacement (v1 -> v2)", () => {
    const doc = documentVaultStore.addDocument({
      user_id: "user",
      name: "Insurance Policy",
      original_filename: "policy_2025.pdf",
      category: "Insurance",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 500000,
      file_url: "data:application/pdf;base64,v1data",
      extracted_text: "Policy 2025",
      expiry_date: "2025-12-31",
      is_sensitive: false,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: [],
    });

    // Upload new 2026 version
    const updated = documentVaultStore.uploadNewVersion(
      doc.id,
      {
        url: "data:application/pdf;base64,v2data",
        size: 520000,
        mimeType: "application/pdf",
        originalFilename: "policy_2026.pdf",
      },
      {
        expiryDate: "2026-12-31",
        notes: "Renewed for 2026",
      }
    );

    expect(updated?.version).toBe(2);
    expect(updated?.original_filename).toBe("policy_2026.pdf");

    // Check version history stack
    const history = documentVaultStore.getVersionHistory(doc.id);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].version).toBe(1);
  });
});

describe("Voice Document Search: Intent Parsing", () => {
  it("parses: Find my Aadhaar document", () => {
    const intent = parseVoiceIntent("Find my Aadhaar document");
    expect(intent.action).toBe("find_document");
    expect(intent.documentQuery?.toLowerCase()).toContain("aadhaar");
    expect(intent.documentCategory).toBe("Identity");
  });

  it("parses: Show my education certificates", () => {
    const intent = parseVoiceIntent("Show my education certificates");
    expect(intent.action).toBe("find_document");
    expect(intent.documentCategory).toBe("Education");
  });

  it("parses: Find my driving licence", () => {
    const intent = parseVoiceIntent("Find my driving licence");
    expect(intent.action).toBe("find_document");
    expect(intent.documentCategory).toBe("Identity");
  });
});
