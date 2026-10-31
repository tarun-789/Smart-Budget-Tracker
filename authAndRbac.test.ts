import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeRoles,
  decodeJwt,
  mintJwt,
  verifyJwtSignature,
  rotateRefreshToken,
  resetRotationState,
  getStoredRotationState,
  verifyTokenBackend,
  callProtectedApiEndpoint,
  createClerkSupabaseClient,
  generateSupabaseRlsSql,
} from "../utils/authUtils";

describe("Enterprise Authentication & RBAC Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
    resetRotationState();
  });

  // ---------------------------------------------------------------------------
  // 1. Role Normalization (Roadsidecoder Guide: normalizeRoles)
  // ---------------------------------------------------------------------------
  describe("normalizeRoles", () => {
    it("handles standard string arrays", () => {
      expect(normalizeRoles(["admin", "user"])).toEqual(["admin", "user"]);
    });

    it("filters out empty or whitespace-only elements", () => {
      expect(normalizeRoles(["admin", "  ", "", "analyst"])).toEqual([
        "admin",
        "analyst",
      ]);
    });

    it("parses comma-separated role strings from IDPs", () => {
      expect(normalizeRoles("admin, analyst, user")).toEqual([
        "admin",
        "analyst",
        "user",
      ]);
    });

    it("handles single role string", () => {
      expect(normalizeRoles("admin")).toEqual(["admin"]);
    });

    it("safely handles null, undefined, and non-string inputs", () => {
      expect(normalizeRoles(null)).toEqual([]);
      expect(normalizeRoles(undefined)).toEqual([]);
      expect(normalizeRoles(12345)).toEqual([]);
      expect(normalizeRoles({})).toEqual([]);
      expect(normalizeRoles("   ")).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. JWT Decoding ("Signed, not encrypted")
  // ---------------------------------------------------------------------------
  describe("JWT Decoding & Structure", () => {
    it("decodes a standard 3-part base64url token into header, payload, and signature", () => {
      const token = mintJwt({
        sub: "user-1234",
        email: "alex@finsight.ai",
        name: "Alex Rivera",
        role: "admin",
        roles: ["admin"],
      });

      const decoded = decodeJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.header.alg).toBe("HS256");
      expect(decoded?.header.typ).toBe("JWT");
      expect(decoded?.payload.sub).toBe("user-1234");
      expect(decoded?.payload.email).toBe("alex@finsight.ai");
      expect(decoded?.payload.role).toBe("admin");
      expect(decoded?.payload.roles).toContain("admin");
      expect(typeof decoded?.payload.iat).toBe("number");
      expect(typeof decoded?.payload.exp).toBe("number");
      expect(decoded?.signature).toBeTruthy();
    });

    it("returns null for malformed or non-token strings", () => {
      expect(decodeJwt("")).toBeNull();
      expect(decodeJwt("invalid.token")).toBeNull();
      expect(decodeJwt("invalid.token.structure.extra")).toBeNull();
      expect(decodeJwt(null as unknown as string)).toBeNull();
    });

    it("correctly handles base64url URL-safe characters (- and _)", () => {
      const token = mintJwt({
        sub: "user-with-special-id_xyz-123",
        email: "test+filter@example.com",
      });
      const decoded = decodeJwt(token);
      expect(decoded?.payload.sub).toBe("user-with-special-id_xyz-123");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. JWT Signature Verification & Tamper Detection
  // ---------------------------------------------------------------------------
  describe("JWT Tamper Detection", () => {
    it("validates authentic JWT signatures with the matching secret", () => {
      const secret = "finsight-secure-dev-secret-key-2026";
      const token = mintJwt(
        { sub: "user-007", role: "user", roles: ["user"] },
        secret
      );

      const res = verifyJwtSignature(token, secret);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("detects payload tampering when claims are maliciously modified", () => {
      const secret = "finsight-secure-dev-secret-key-2026";
      const token = mintJwt(
        { sub: "user-007", role: "user", roles: ["user"] },
        secret
      );

      const [header, , signature] = token.split(".");

      // Attacker tampers payload: elevates role from 'user' to 'admin'
      const tamperedPayloadObj = {
        sub: "user-007",
        role: "admin",
        roles: ["admin"],
      };
      const tamperedPayloadB64 = btoa(JSON.stringify(tamperedPayloadObj))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const tamperedToken = `${header}.${tamperedPayloadB64}.${signature}`;

      // Signature verification MUST fail
      const res = verifyJwtSignature(tamperedToken, secret);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Signature mismatch");
    });

    it("fails verification when signed with a different secret", () => {
      const token = mintJwt({ sub: "user-007" }, "secret-key-A");
      const res = verifyJwtSignature(token, "secret-key-B");
      expect(res.isValid).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Refresh Token Rotation & Replay Theft Detection (RFC 6749 Sec 10.4)
  // ---------------------------------------------------------------------------
  describe("Refresh Token Rotation with Reuse Detection Tripwire", () => {
    it("successfully rotates single-use refresh token and issues a new pair", () => {
      const state1 = getStoredRotationState();
      const initialRefreshToken = state1.activeRefreshToken;
      expect(initialRefreshToken).toBeTruthy();

      // Rotate once: R1 -> R2
      const res1 = rotateRefreshToken(initialRefreshToken, {
        sub: "user-rot-1",
        email: "user@rot.test",
      });

      expect(res1.success).toBe(true);
      expect(res1.isTheftDetected).toBe(false);
      expect(res1.refreshToken).toBeTruthy();
      expect(res1.refreshToken).not.toEqual(initialRefreshToken);

      const state2 = getStoredRotationState();
      expect(
        state2.history.find((h) => h.tokenId === initialRefreshToken)?.isUsed
      ).toBe(true);
      expect(state2.activeRefreshToken).toBe(res1.refreshToken);
      expect(state2.isRevoked).toBe(false);
    });

    it("trips theft alarm and revokes entire family when a used refresh token is replayed", () => {
      // 1. Initial token R1
      const initialRefreshToken = getStoredRotationState().activeRefreshToken;

      // 2. Legitimate rotation: R1 -> R2
      const res1 = rotateRefreshToken(initialRefreshToken);
      expect(res1.success).toBe(true);
      const secondRefreshToken = res1.refreshToken!;

      // 3. Legitimate rotation: R2 -> R3
      const res2 = rotateRefreshToken(secondRefreshToken);
      expect(res2.success).toBe(true);

      // 4. ATTACK: Adversary replays used token R1
      const attackRes = rotateRefreshToken(initialRefreshToken);

      expect(attackRes.success).toBe(false);
      expect(attackRes.isTheftDetected).toBe(true);
      expect(attackRes.message).toContain("Token reuse attack detected");

      // 5. Verification: Entire family is revoked
      const stateRevoked = getStoredRotationState();
      expect(stateRevoked.isRevoked).toBe(true);
      expect(stateRevoked.revocationReason).toContain(
        "Token reuse attack detected"
      );

      // 6. Even the legitimate latest token R3 is now revoked and rejected
      const blockedRes = rotateRefreshToken(res2.refreshToken!);
      expect(blockedRes.success).toBe(false);
      expect(blockedRes.message).toContain("revoked");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Backend Token Introspection & Protected API RBAC Endpoint
  // ---------------------------------------------------------------------------
  describe("Backend Token Introspection & API RBAC", () => {
    it("allows admin access to /api/admin/stats with 200 OK", () => {
      const adminToken = mintJwt({
        sub: "admin-999",
        email: "admin@finsight.ai",
        role: "admin",
        roles: ["admin"],
      });

      const response = callProtectedApiEndpoint(adminToken, "admin");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalUsers");
      expect(response.body).toHaveProperty("databaseHealth");
    });

    it("blocks non-admin user on /api/admin/stats with 403 Forbidden", () => {
      const userToken = mintJwt({
        sub: "user-111",
        email: "user@finsight.ai",
        role: "user",
        roles: ["user"],
      });

      const response = callProtectedApiEndpoint(userToken, "admin");
      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Forbidden");
      expect(response.message).toContain("403 Forbidden");
    });

    it("rejects invalid or tampered token with 401 Unauthorized", () => {
      const response = callProtectedApiEndpoint("invalid.token.here", "admin");
      expect(response.status).toBe(401);
      expect(response.message).toContain("401 Unauthorized");
    });

    it("introspects token via verifyTokenBackend RFC 7662 simulation", () => {
      const token = mintJwt({
        sub: "analyst-55",
        email: "analyst@finsight.ai",
        roles: ["analyst"],
      });

      const introspection = verifyTokenBackend(token);
      expect(introspection.active).toBe(true);
      expect(introspection.sub).toBe("analyst-55");
      expect(introspection.roles).toContain("analyst");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Clerk + Supabase RLS Custom Fetch Wrapper
  // ---------------------------------------------------------------------------
  describe("Clerk Supabase Client Header Injection", () => {
    it("creates a Supabase client configured with Clerk JWT fetch wrapper", () => {
      const mockGetToken = async () => "clerk_jwt_token_sample_abc123";
      const client = createClerkSupabaseClient(
        "https://xyzcompany.supabase.co",
        "anon-sample-key",
        mockGetToken
      );

      expect(client).toBeDefined();
      expect(client.from).toBeTypeOf("function");
      expect(client.auth).toBeDefined();
    });

    it("generates production-ready PostgreSQL Row Level Security (RLS) SQL", () => {
      const sql = generateSupabaseRlsSql();
      expect(sql).toContain("CREATE OR REPLACE FUNCTION requesting_user_id()");
      expect(sql).toContain("request.jwt.claims");
      expect(sql).toContain("sub");
      expect(sql).toContain("ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("requesting_user_id() = user_id");
    });
  });
});
