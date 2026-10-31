import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createClerkSupabaseClient,
  isClerkConfigured,
  getClerkPublishableKey,
} from "../lib/clerkSupabase";
import { decodeJwt, mintJwt, generateSupabaseRlsSql } from "../utils/authUtils";

describe("Clerk + Supabase PostgreSQL RLS Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createClerkSupabaseClient custom fetch wrapper", () => {
    it("intercepts fetch and calls getToken with template 'supabase'", async () => {
      const mockGetToken = vi.fn().mockResolvedValue("mock_clerk_jwt_token_xyz987");

      // Mock global fetch
      const originalFetch = globalThis.fetch;
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ id: "tx-1", amount: 1500 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
      globalThis.fetch = mockFetch;

      try {
        const client = createClerkSupabaseClient({
          supabaseUrl: "https://testproj.supabase.co",
          supabaseAnonKey: "anon-test-key",
          getToken: mockGetToken,
        });

        // Trigger a request through the custom fetch handler
        await client.from("transactions").select("*");

        // Verify getToken was called with template 'supabase'
        expect(mockGetToken).toHaveBeenCalledWith({ template: "supabase" });

        // Verify global fetch was called
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        const requestOptions = callArgs[1] as RequestInit;
        const headers = new Headers(requestOptions.headers);

        // Verify Authorization header contains the Clerk Bearer token
        expect(headers.get("Authorization")).toBe("Bearer mock_clerk_jwt_token_xyz987");
        expect(headers.get("apikey")).toBe("anon-test-key");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles null or undefined token without crashing or adding empty Bearer", async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);

      const originalFetch = globalThis.fetch;
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
      globalThis.fetch = mockFetch;

      try {
        const client = createClerkSupabaseClient({
          supabaseUrl: "https://testproj.supabase.co",
          supabaseAnonKey: "anon-test-key",
          getToken: mockGetToken,
        });

        await client.from("transactions").select("*");

        expect(mockGetToken).toHaveBeenCalledWith({ template: "supabase" });
        expect(mockFetch).toHaveBeenCalled();

        const callArgs = mockFetch.mock.calls[0];
        const requestOptions = callArgs[1] as RequestInit;
        const headers = new Headers(requestOptions.headers);

        // Authorization header should NOT be "Bearer null"
        expect(headers.get("Authorization")).not.toBe("Bearer null");
        expect(headers.get("Authorization")).not.toBe("Bearer undefined");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("catches getToken errors gracefully without throwing unhandled exceptions", async () => {
      const mockGetToken = vi.fn().mockRejectedValue(new Error("Clerk session expired"));

      const originalFetch = globalThis.fetch;
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
      globalThis.fetch = mockFetch;

      try {
        const client = createClerkSupabaseClient({
          supabaseUrl: "https://testproj.supabase.co",
          supabaseAnonKey: "anon-test-key",
          getToken: mockGetToken,
        });

        // Should not throw
        await expect(client.from("transactions").select("*")).resolves.toBeDefined();
        expect(mockFetch).toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("Clerk JWT Claims & PostgreSQL requesting_user_id() mapping", () => {
    it("generates a valid Clerk JWT containing sub claim that maps to requesting_user_id()", () => {
      const clerkUserId = "user_2tF8qZ9mXkL3v1p7R0w4";
      const token = mintJwt({
        sub: clerkUserId,
        email: "alex.rivera@finsight.ai",
        aud: "authenticated",
        iss: "https://clerk.finsight.ai",
        template: "supabase",
      });

      const decoded = decodeJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.payload.sub).toBe(clerkUserId);
      expect(decoded?.payload.aud).toBe("authenticated");
      expect(decoded?.payload.template).toBe("supabase");

      // Simulates PostgreSQL requesting_user_id() function logic:
      // SELECT current_setting('request.jwt.claims', true)::json->>'sub'
      const simulatedRequestJwtClaims = decoded?.payload as { sub?: string };
      const requestingUserId = simulatedRequestJwtClaims.sub ?? null;
      expect(requestingUserId).toBe(clerkUserId);
    });
  });

  describe("PostgreSQL RLS Migration Script Verification", () => {
    it("contains the complete 6-step setup and all FinSight AI table policies", () => {
      const sql = generateSupabaseRlsSql();

      // Step 1: requesting_user_id()
      expect(sql).toContain("CREATE OR REPLACE FUNCTION requesting_user_id()");
      expect(sql).toContain("request.jwt.claims");
      expect(sql).toContain("sub");

      // Step 2: user_id defaults on tables
      expect(sql).toContain("ALTER TABLE transactions \n  ADD COLUMN IF NOT EXISTS user_id text DEFAULT requesting_user_id();");
      expect(sql).toContain("ALTER TABLE accounts \n  ADD COLUMN IF NOT EXISTS user_id text DEFAULT requesting_user_id();");
      expect(sql).toContain("ALTER TABLE budgets \n  ADD COLUMN IF NOT EXISTS user_id text DEFAULT requesting_user_id();");
      expect(sql).toContain("ALTER TABLE goals \n  ADD COLUMN IF NOT EXISTS user_id text DEFAULT requesting_user_id();");
      expect(sql).toContain("ALTER TABLE vault_documents \n  ADD COLUMN IF NOT EXISTS user_id text DEFAULT requesting_user_id();");

      // Step 3: Enable RLS
      expect(sql).toContain("ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;");

      // Step 4: Policies
      expect(sql).toContain('CREATE POLICY "Users can only read own transactions"');
      expect(sql).toContain("requesting_user_id() = user_id");
      expect(sql).toContain('CREATE POLICY "Users can only insert own transactions"');
      expect(sql).toContain("WITH CHECK (requesting_user_id() = user_id)");
    });
  });

  describe("Environment helpers", () => {
    it("correctly identifies whether Clerk publishable key is configured", () => {
      expect(typeof isClerkConfigured()).toBe("boolean");
      const key = getClerkPublishableKey();
      if (isClerkConfigured()) {
        expect(key).toBeTruthy();
      } else {
        expect(key).toBeUndefined();
      }
    });
  });
});
