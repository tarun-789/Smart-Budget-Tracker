// FinSight AI — Comprehensive Tests for Secure AI-Powered Document Vault
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptDocumentClientSide,
  decryptDocumentClientSide,
  initializeZeroKnowledgeKey,
  getZeroKnowledgeKeyStatus,
  lockZeroKnowledgeKey,
  generateEmergencyRecoveryKit,
} from "../services/zeroKnowledgeCrypto";
import {
  extractEntitiesFromDocument,
  detectDocumentRelationships,
  buildKnowledgeGraph,
} from "../services/entityExtractionService";
import {
  searchDocumentsSemantically,
  calculateCosineSimilarity,
} from "../services/semanticSearchService";
import {
  scanFileForMalware,
  sanitizeFilename,
} from "../services/malwareScanService";
import { parseVoiceIntent } from "../services/voice/intentParser";
import type { VaultDocument } from "../types";

describe("Secure AI-Powered Document Vault", () => {
  beforeEach(() => {
    localStorage.clear();
    lockZeroKnowledgeKey();
  });

  describe("1. Zero-Knowledge Client-Side AES-256-GCM Encryption", () => {
    it("should encrypt and decrypt document payload accurately", async () => {
      const plaintext = "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==";
      const encrypted = await encryptDocumentClientSide(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe("AES-256-GCM");
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = await decryptDocumentClientSide(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different IV and ciphertext for identical payloads (semantic security)", async () => {
      const plaintext = "Secret Indian Income Tax Return Form 16";
      const enc1 = await encryptDocumentClientSide(plaintext);
      const enc2 = await encryptDocumentClientSide(plaintext);

      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

      const dec1 = await decryptDocumentClientSide(enc1);
      const dec2 = await decryptDocumentClientSide(enc2);
      expect(dec1).toBe(plaintext);
      expect(dec2).toBe(plaintext);
    });

    it("should generate a valid emergency recovery kit and key fingerprint", async () => {
      const fingerprint = await initializeZeroKnowledgeKey("MySecretPassphrase2026");
      expect(fingerprint).toBeDefined();

      const status = getZeroKnowledgeKeyStatus();
      expect(status.isActive).toBe(true);
      expect(status.fingerprint).toBe(fingerprint);

      const kit = generateEmergencyRecoveryKit("MySecretPassphrase2026");
      expect(kit.keyFingerprint).toBe(fingerprint);
      expect(kit.recoveryText).toContain("FINSIGHT AI — ZERO-KNOWLEDGE VAULT RECOVERY KIT");
      expect(kit.recoveryText).toContain("MySecretPassphrase2026");
    });

    it("should support custom passphrase key derivation", async () => {
      await initializeZeroKnowledgeKey("MySuperSecretVaultKey2026!#$");
      const text = "Aadhaar number 9845 2314 7890";
      const encrypted = await encryptDocumentClientSide(text);
      const decrypted = await decryptDocumentClientSide(encrypted);
      expect(decrypted).toBe(text);
    });
  });

  describe("2. AI Named Entity Recognition (NER) & Knowledge Graph", () => {
    const sampleDoc: VaultDocument = {
      id: "doc-edu-1",
      user_id: "user",
      name: "B.Tech Degree Certificate",
      original_filename: "Degree.pdf",
      category: "Education",
      file_type: "pdf",
      mime_type: "application/pdf",
      file_size: 102400,
      file_url: "data:application/pdf;base64,AAAA",
      extracted_text:
        "ABC University Bachelor of Technology in Computer Science awarded to Malipeddi Tarun with Distinction.",
      expiry_date: null,
      expiry_status: "not_applicable",
      days_until_expiry: null,
      document_number: "2026-CSE-894",
      document_number_type: "Certificate No",
      is_backed_up: true,
      last_backup_at: null,
      is_sensitive: false,
      is_trash: false,
      deleted_at: null,
      version: 1,
      parent_document_id: null,
      tags: ["University", "Academics"],
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    };

    it("should extract entities (PERSON, ISSUER, DOCUMENT_ID)", () => {
      const entities = extractEntitiesFromDocument(sampleDoc);
      expect(entities.length).toBeGreaterThan(0);

      const hasIssuer = entities.some((e) => e.type === "ISSUER" && e.value.includes("University"));
      const hasId = entities.some((e) => e.type === "DOCUMENT_ID" && e.value === "2026-CSE-894");
      expect(hasIssuer).toBe(true);
      expect(hasId).toBe(true);
    });

    it("should detect cross-document relationships based on shared entities", () => {
      const doc2: VaultDocument = {
        ...sampleDoc,
        id: "doc-edu-2",
        name: "Official Transcript",
        extracted_text: "ABC University Semester 8 Grade Card for student",
        document_number: "TRANS-990",
      };

      const edges = detectDocumentRelationships([sampleDoc, doc2]);
      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].sourceDocId).toBe(sampleDoc.id);
      expect(edges[0].targetDocId).toBe(doc2.id);
      expect(edges[0].relationshipType).toBe("SAME_ISSUER");
    });

    it("should build complete visual knowledge graph structure", () => {
      const graph = buildKnowledgeGraph([sampleDoc]);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      const rootNode = graph.nodes.find((n) => n.id === "user-root");
      expect(rootNode).toBeDefined();

      const docNode = graph.nodes.find((n) => n.id === "doc-" + sampleDoc.id);
      expect(docNode).toBeDefined();
    });
  });

  describe("3. Vector Embedding Simulator & Semantic Search", () => {
    const testDocs: VaultDocument[] = [
      {
        id: "doc-ins",
        user_id: "user",
        name: "HDFC ERGO Health Suraksha",
        original_filename: "Policy.pdf",
        category: "Insurance",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size: 500000,
        file_url: "",
        extracted_text: "Health insurance medical cover cashless hospitalization coverage premium Rs 12000",
        expiry_date: "2027-05-01",
        expiry_status: "valid",
        days_until_expiry: 230,
        document_number: "HDFC-POL-991",
        document_number_type: "Policy No",
        is_backed_up: true,
        last_backup_at: null,
        is_sensitive: false,
        is_trash: false,
        deleted_at: null,
        version: 1,
        parent_document_id: null,
        tags: ["Health", "Mediclaim"],
        created_at: "",
        updated_at: "",
      },
      {
        id: "doc-fly",
        user_id: "user",
        name: "Passport",
        original_filename: "Passport.pdf",
        category: "Travel",
        file_type: "pdf",
        mime_type: "application/pdf",
        file_size: 400000,
        file_url: "",
        extracted_text: "Republic of India Passport Visa immigration travel border control",
        expiry_date: "2032-01-01",
        expiry_status: "valid",
        days_until_expiry: 1900,
        document_number: "Z1234567",
        document_number_type: "Passport No",
        is_backed_up: true,
        last_backup_at: null,
        is_sensitive: true,
        is_trash: false,
        deleted_at: null,
        version: 1,
        parent_document_id: null,
        tags: ["Identity", "Travel"],
        created_at: "",
        updated_at: "",
      },
    ];

    it("should compute cosine similarity accurately", () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];

      expect(calculateCosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
      expect(calculateCosineSimilarity(v1, v3)).toBeCloseTo(0.0, 5);
    });

    it("should semantically match insurance concepts even without exact keyword match", () => {
      const results = searchDocumentsSemantically("hospitalization mediclaim coverage", testDocs);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.id).toBe("doc-ins");
      expect(results[0].similarityScore).toBeGreaterThan(0.3);
    });

    it("should rank travel documents higher for travel and immigration queries", () => {
      const results = searchDocumentsSemantically("international visa travel docs", testDocs);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.id).toBe("doc-fly");
    });
  });

  describe("4. Malware & Antivirus Scanning Service", () => {
    it("should pass benign PDF files", async () => {
      const file = new File(["%PDF-1.4 standard document content"], "Aadhaar.pdf", {
        type: "application/pdf",
      });
      const result = await scanFileForMalware(file);
      expect(result.safe).toBe(true);
      expect(result.sha256Checksum).toBeDefined();
    });

    it("should block executable or dangerous script extensions", async () => {
      const exeFile = new File(["malicious payload"], "invoice.pdf.exe", {
        type: "application/octet-stream",
      });
      const result = await scanFileForMalware(exeFile);
      expect(result.safe).toBe(false);
      expect(result.threatReason).toContain("Dangerous executable or script");
    });

    it("should detect EICAR antivirus test signature", async () => {
      const eicarString = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
      const eicarFile = new File([eicarString], "test_virus.txt", { type: "text/plain" });
      const result = await scanFileForMalware(eicarFile);
      expect(result.safe).toBe(false);
      expect(result.threatReason).toContain("EICAR Standard Antivirus Test Signature");
    });

    it("should sanitize path traversal characters in filenames", () => {
      expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
      expect(sanitizeFilename("..\\..\\boot.ini")).toBe("boot.ini");
      expect(sanitizeFilename("Valid_Aadhaar.pdf")).toBe("Valid_Aadhaar.pdf");
    });
  });

  describe("5. Voice Assistant Document Vault Queries", () => {
    it("should parse expiry date query commands", () => {
      const intent = parseVoiceIntent("When does my driving licence expire?");
      expect(intent.action).toBe("query_document_expiry");
      expect(intent.documentQuery?.toLowerCase()).toContain("driving licence");
    });

    it("should parse bundle creation commands", () => {
      const intent1 = parseVoiceIntent("Create job application bundle");
      expect(intent1.action).toBe("create_document_bundle");
      expect(intent1.bundleType).toBe("job");

      const intent2 = parseVoiceIntent("Generate travel packet bundle");
      expect(intent2.action).toBe("create_document_bundle");
      expect(intent2.bundleType).toBe("travel");

      const intent3 = parseVoiceIntent("Export tax kyc bundle");
      expect(intent3.action).toBe("create_document_bundle");
      expect(intent3.bundleType).toBe("tax");
    });
  });
});
