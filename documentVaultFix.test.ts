import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllActivities,
  logDocumentActivity,
  clearDocumentActivities,
  getDocumentActivities,
} from "../services/documentActivityService";
import {
  getAllShares,
  createShareLink,
  saveShares,
  revokeShare,
  getShareByToken,
} from "../services/documentShareService";
import type { VaultDocument } from "../types";

describe("Document Vault Service Stability & Snapshot Caching", () => {
  beforeEach(() => {
    localStorage.clear();
    clearDocumentActivities();
    saveShares([]);
  });

  it("returns referentially stable snapshot for getAllActivities to satisfy useSyncExternalStore", () => {
    const snapshot1 = getAllActivities();
    const snapshot2 = getAllActivities();

    // Must be referentially identical (===) so useSyncExternalStore does not trigger infinite loops
    expect(snapshot1).toBe(snapshot2);
  });

  it("updates cached activities reference when logDocumentActivity is called", () => {
    const initialSnapshot = getAllActivities();

    const logged = logDocumentActivity(
      "doc-test-1",
      "Test Aadhaar",
      "viewed",
      "Viewed in vault"
    );

    const nextSnapshot = getAllActivities();

    // After mutation, reference should update
    expect(nextSnapshot).not.toBe(initialSnapshot);
    expect(nextSnapshot[0].id).toBe(logged.id);
    expect(nextSnapshot[0].document_name).toBe("Test Aadhaar");

    // Subsequent reads without mutation should again be referentially stable
    const thirdSnapshot = getAllActivities();
    expect(thirdSnapshot).toBe(nextSnapshot);
  });

  it("filters activities correctly by documentId", () => {
    logDocumentActivity("doc-A", "Passport", "uploaded", "Uploaded passport");
    logDocumentActivity("doc-B", "PAN Card", "uploaded", "Uploaded pan");

    const docAActs = getDocumentActivities("doc-A");
    expect(docAActs.length).toBeGreaterThanOrEqual(1);
    expect(docAActs.every((a) => a.document_id === "doc-A")).toBe(true);
  });

  it("returns referentially stable snapshot for getAllShares", () => {
    const shares1 = getAllShares();
    const shares2 = getAllShares();

    expect(shares1).toBe(shares2);
  });

  it("creates and revokes shares with cached state updates", () => {
    const mockDoc: VaultDocument = {
      id: "doc-share-test",
      user_id: "user",
      name: "Degree Certificate",
      original_filename: "degree.pdf",
      category: "Education",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      file_url: "data:application/pdf;base64,JVBERi0xLjQK",
      extracted_text: "University Degree",
      expiry_date: null,
      expiry_status: "not_applicable",
      days_until_expiry: null,
      document_number: "DEG-1234",
      document_number_type: "Reg No",
      is_backed_up: false,
      last_backup_at: null,
      is_sensitive: false,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const share = createShareLink(mockDoc, { durationHours: 24 });
    expect(share.token || share.shareId).toBeDefined();

    const lookup = getShareByToken(share.shareId);
    expect(lookup.isValid).toBe(true);
    expect(lookup.share?.documentName).toBe("Degree Certificate");

    // Revoke share
    const revoked = revokeShare(share.shareId);
    expect(revoked).toBe(true);

    const lookupAfterRevoke = getShareByToken(share.shareId);
    expect(lookupAfterRevoke.isValid).toBe(false);
    expect(lookupAfterRevoke.reason).toBe("revoked");
  });
});
