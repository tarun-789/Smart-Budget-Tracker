// FinSight AI — Comprehensive Tests for 12 Advanced Document Vault Features
import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyPin,
  unlockSession,
  isSessionUnlocked,
  lockVault,
  setCustomPin,
  resetPinToDefault,
  getStoredPin,
} from "../services/vaultSecurityService";
import {
  extractDocumentNumber,
  checkDuplicateDocument,
} from "../services/ocrService";
import {
  createShareLink,
  getShareByToken,
  incrementShareView,
  revokeShare,
} from "../services/documentShareService";
import {
  logDocumentActivity,
  getDocumentActivities,
  clearDocumentActivities,
} from "../services/documentActivityService";
import { documentVaultStore } from "../services/documentStore";
import { parseVoiceIntent } from "../services/voice/intentParser";
import type { VaultDocument } from "../types";

describe("Advanced Document Vault Features", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPinToDefault();
    clearDocumentActivities();
  });

  describe("1. PIN Security Lock Service", () => {
    it("should verify default PIN 1234 correctly", () => {
      expect(getStoredPin()).toBe("1234");
      expect(verifyPin("1234")).toBe(true);
      expect(verifyPin("9999")).toBe(false);
      expect(verifyPin("")).toBe(false);
    });

    it("should allow setting and resetting a custom 4-digit PIN", () => {
      expect(setCustomPin("5678")).toBe(true);
      expect(getStoredPin()).toBe("5678");
      expect(verifyPin("5678")).toBe(true);
      expect(verifyPin("1234")).toBe(false);

      // Rejects invalid PIN formats
      expect(setCustomPin("12")).toBe(false);
      expect(setCustomPin("abcd")).toBe(false);

      // Reset
      resetPinToDefault();
      expect(getStoredPin()).toBe("1234");
    });

    it("should handle session unlocking and locking with expiry", () => {
      expect(isSessionUnlocked()).toBe(false);

      unlockSession(5); // 5 minutes
      expect(isSessionUnlocked()).toBe(true);

      lockVault();
      expect(isSessionUnlocked()).toBe(false);
    });
  });

  describe("2. Document Number Extraction Engine", () => {
    it("should extract 12-digit Aadhaar Card number", () => {
      const text = "UIDAI Aadhaar Card Name: Malipeddi Tarun DOB: 14/08/1998 9845 2314 7890 Mera Aadhaar";
      const result = extractDocumentNumber(text, "Identity");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("Aadhaar No");
      expect(result?.number).toBe("9845 2314 7890");
    });

    it("should extract Indian PAN Card number (5 letters, 4 digits, 1 letter)", () => {
      const text = "INCOME TAX DEPARTMENT GOVT OF INDIA PERMANENT ACCOUNT NUMBER ABCDE1234F";
      const result = extractDocumentNumber(text, "Identity");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("PAN No");
      expect(result?.number).toBe("ABCDE1234F");
    });

    it("should extract Indian Passport number", () => {
      const text = "REPUBLIC OF INDIA PASSPORT J8492014 SURNAME MALIPEDDI";
      const result = extractDocumentNumber(text, "Travel");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("Passport No");
      expect(result?.number).toBe("J8492014");
    });

    it("should extract Driving Licence number", () => {
      const text = "TRANSPORT DEPARTMENT DRIVING LICENCE DL No: KA-01-2021-0089123";
      const result = extractDocumentNumber(text, "Identity");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("DL No");
      expect(result?.number).toBe("KA-01-2021-0089123");
    });

    it("should extract Insurance Policy Number", () => {
      const text = "STAR HEALTH INSURANCE Policy Number: SH-99201-2026 Sum Insured: ₹10 Lakhs";
      const result = extractDocumentNumber(text, "Insurance");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("Policy No");
      expect(result?.number).toBe("SH-99201-2026");
    });
  });

  describe("3. Duplicate Document Detection", () => {
    const mockVaultDocs: VaultDocument[] = [
      {
        id: "doc-aadhaar",
        user_id: "user",
        name: "Aadhaar Card",
        original_filename: "aadhaar_scan.pdf",
        category: "Identity",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size: 450000,
        file_url: "data:application/pdf;base64,sample",
        extracted_text: "Aadhaar 9845 2314 7890",
        document_number: "9845 2314 7890",
        document_number_type: "Aadhaar No",
        expiry_date: null,
        is_sensitive: true,
        is_trash: false,
        deleted_at: null,
        version: 1,
        parent_document_id: null,
        tags: [],
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      },
    ];

    it("should detect duplicate document when extracted ID matches", () => {
      const check = checkDuplicateDocument(
        {
          name: "New Upload Aadhaar",
          docNumber: "9845 2314 7890",
        },
        mockVaultDocs
      );

      expect(check.isDuplicate).toBe(true);
      expect(check.matchType).toBe("identical_id");
      expect(check.duplicateDoc?.id).toBe("doc-aadhaar");
    });

    it("should detect duplicate document when filename and byte size match", () => {
      const check = checkDuplicateDocument(
        {
          name: "Any Name",
          originalFilename: "aadhaar_scan.pdf",
          size: 450010, // within 50 bytes
        },
        mockVaultDocs
      );

      expect(check.isDuplicate).toBe(true);
      expect(check.matchType).toBe("exact_file");
    });

    it("should return false when uploading a completely unique document", () => {
      const check = checkDuplicateDocument(
        {
          name: "Rental Agreement 2026",
          originalFilename: "rent_agreement.pdf",
          size: 980000,
          docNumber: "RENT-9920",
        },
        mockVaultDocs
      );

      expect(check.isDuplicate).toBe(false);
    });
  });

  describe("4. Secure Time-Expiring Sharing Service", () => {
    const sampleDoc: VaultDocument = {
      id: "doc-share-test",
      user_id: "user",
      name: "Passport Copy",
      original_filename: "passport.pdf",
      category: "Travel",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 120000,
      file_url: "data:application/pdf;base64,sample",
      extracted_text: "Passport J8492014",
      expiry_date: null,
      is_sensitive: true,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: [],
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    };

    it("should create a temporary share link with expiration and passcode", () => {
      const share = createShareLink(sampleDoc, {
        durationHours: 24,
        passcode: "9842",
        maxViews: 5,
      });

      expect(share.shareId).toBeDefined();
      expect(share.documentId).toBe("doc-share-test");
      expect(share.passcode).toBe("9842");
      expect(share.isRevoked).toBe(false);
      expect(new Date(share.expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Validate lookup by token
      const lookup = getShareByToken(share.shareId);
      expect(lookup.isValid).toBe(true);
      expect(lookup.share?.documentName).toBe("Passport Copy");
    });

    it("should count views and revoke link", () => {
      const share = createShareLink(sampleDoc, { durationHours: 1, maxViews: 2 });
      expect(share.viewCount).toBe(0);

      incrementShareView(share.shareId);
      const res1 = getShareByToken(share.shareId);
      expect(res1.share?.viewCount).toBe(1);

      // Revoke
      revokeShare(share.shareId);
      const res2 = getShareByToken(share.shareId);
      expect(res2.isValid).toBe(false);
      expect(res2.reason).toBe("revoked");
    });
  });

  describe("5. Document Activity & Audit Trail", () => {
    it("should record and retrieve timestamped activity events", () => {
      logDocumentActivity("doc-1", "Aadhaar Card", "uploaded", "Uploaded to vault.");
      logDocumentActivity("doc-1", "Aadhaar Card", "unlocked", "PIN verified.");
      logDocumentActivity("doc-1", "Aadhaar Card", "shared", "Created 24h link.");

      const activities = getDocumentActivities("doc-1");
      expect(activities.length).toBe(3);
      expect(activities[0].activity_type).toBe("shared"); // Most recent first
      expect(activities[1].activity_type).toBe("unlocked");
      expect(activities[2].activity_type).toBe("uploaded");
    });
  });

  describe("6. Cloud Backup Sync Engine", () => {
    it("should mark documents as cloud backed up with timestamp", () => {
      const result = documentVaultStore.backupDocumentsToCloud(["doc-3"]);
      expect(result.backedUpCount).toBe(1);

      const doc = documentVaultStore.getDocumentById("doc-3");
      expect(doc?.is_backed_up).toBe(true);
      expect(doc?.last_backup_at).toBeDefined();
    });
  });

  describe("7. Voice Document Commands", () => {
    it("should parse 'Lock my document vault' command", () => {
      const intent = parseVoiceIntent("Lock my document vault");
      expect(intent.action).toBe("find_document");
      expect(intent.documentQuery).toBe("lock_vault");
    });

    it("should parse 'Show expiring documents' command", () => {
      const intent = parseVoiceIntent("Show my expiring documents");
      expect(intent.action).toBe("find_document");
      expect(intent.documentQuery).toBe("expiring");
    });
  });
});
