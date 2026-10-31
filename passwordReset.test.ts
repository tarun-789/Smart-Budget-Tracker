import { describe, it, expect, beforeEach } from "vitest";
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  updateUserPasswordInRegistry,
  getRegisteredUsers,
  saveRegisteredUsers,
  RESET_TOKENS_KEY,
  ACTIVE_USER_SESSION_KEY,
  TOKEN_EXPIRY_MS,
  type RegisteredUser,
  type PasswordResetToken,
} from "../services/authRegistry";

describe("Password Reset System & Token Lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    // Seed test users
    const testUsers: RegisteredUser[] = [
      {
        id: "user-test-1",
        email: "testuser@gmail.com",
        full_name: "Test User",
        password: "OldPassword123!",
        created_at: new Date().toISOString(),
      },
    ];
    saveRegisteredUsers(testUsers);
  });

  describe("Token Generation", () => {
    it("creates a secure token with expiration and valid reset URL", () => {
      const email = "testuser@gmail.com";
      const { token, resetUrl, expiresAt } = createPasswordResetToken(email, "http://localhost:5173");

      expect(token).toBeDefined();
      expect(token.startsWith("rst_")).toBe(true);
      expect(expiresAt).toBeGreaterThan(Date.now());
      expect(expiresAt - Date.now()).toBeLessThanOrEqual(TOKEN_EXPIRY_MS);
      expect(resetUrl).toContain("http://localhost:5173/reset-password");
      expect(resetUrl).toContain(`token=${token}`);
      expect(resetUrl).toContain(`email=${encodeURIComponent(email)}`);
    });

    it("persists generated tokens in storage", () => {
      const { token } = createPasswordResetToken("testuser@gmail.com");
      const stored = JSON.parse(localStorage.getItem(RESET_TOKENS_KEY) || "[]") as PasswordResetToken[];

      expect(stored.length).toBeGreaterThan(0);
      const found = stored.find((t) => t.token === token);
      expect(found).toBeDefined();
      expect(found?.email).toBe("testuser@gmail.com");
      expect(found?.used).toBe(false);
    });
  });

  describe("Token Verification & Security Rules", () => {
    it("validates a newly generated token successfully", () => {
      const email = "testuser@gmail.com";
      const { token } = createPasswordResetToken(email);

      const verification = verifyPasswordResetToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.email).toBe(email);
      expect(verification.error).toBeUndefined();
    });

    it("rejects non-existent or invalid tokens", () => {
      const verification = verifyPasswordResetToken("non_existent_token_xyz");
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("invalid or not found");
    });

    it("rejects empty or missing tokens", () => {
      const verification = verifyPasswordResetToken("");
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("Missing or invalid");
    });

    it("rejects expired tokens", () => {
      const expiredToken: PasswordResetToken = {
        token: "rst_expired_123",
        email: "testuser@gmail.com",
        expiresAt: Date.now() - 10000, // 10 seconds ago
        used: false,
        createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify([expiredToken]));

      const verification = verifyPasswordResetToken("rst_expired_123");
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("expired");
    });

    it("rejects single-use tokens that have already been consumed", () => {
      const usedToken: PasswordResetToken = {
        token: "rst_used_456",
        email: "testuser@gmail.com",
        expiresAt: Date.now() + 100000,
        used: true,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify([usedToken]));

      const verification = verifyPasswordResetToken("rst_used_456");
      expect(verification.valid).toBe(false);
      expect(verification.error).toContain("already been used");
    });
  });

  describe("Token Consumption & Single-Use Enforcement", () => {
    it("marks token as used upon consumption and prevents reuse", () => {
      const { token } = createPasswordResetToken("testuser@gmail.com");

      // Verify valid before consumption
      expect(verifyPasswordResetToken(token).valid).toBe(true);

      // Consume
      const consumed = consumePasswordResetToken(token);
      expect(consumed).toBe(true);

      // Verify invalid after consumption
      const secondCheck = verifyPasswordResetToken(token);
      expect(secondCheck.valid).toBe(false);
      expect(secondCheck.error).toContain("already been used");
    });
  });

  describe("Password Update in User Registry", () => {
    it("updates the stored password for the target user", () => {
      const email = "testuser@gmail.com";
      const newPassword = "BrandNewSecretPassword#2026";

      const updated = updateUserPasswordInRegistry(email, newPassword);
      expect(updated).toBe(true);

      const users = getRegisteredUsers();
      const user = users.find((u) => u.email === email);
      expect(user?.password).toBe(newPassword);
    });

    it("updates password inside active session if the user is currently logged in", () => {
      const email = "testuser@gmail.com";
      const sessionUser: RegisteredUser = {
        id: "user-test-1",
        email,
        full_name: "Test User",
        password: "OldPassword123!",
        created_at: new Date().toISOString(),
      };
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, JSON.stringify(sessionUser));

      updateUserPasswordInRegistry(email, "UpdatedSessionPassword#99");

      const active = JSON.parse(localStorage.getItem(ACTIVE_USER_SESSION_KEY) || "{}");
      expect(active.password).toBe("UpdatedSessionPassword#99");
    });

    it("returns false if email does not exist in registry", () => {
      const updated = updateUserPasswordInRegistry("unknown_user@example.com", "SomePass123");
      expect(updated).toBe(false);
    });
  });

  describe("Full End-to-End Password Reset Flow", () => {
    it("completes full flow: generate token -> verify -> consume -> update password -> login succeeds with new pass", () => {
      const email = "testuser@gmail.com";
      const oldPassword = "OldPassword123!";
      const newPassword = "FinSightSuperSecure!2026";

      // 1. User forgot password -> request reset
      const { token, resetUrl } = createPasswordResetToken(email);
      expect(resetUrl).toBeDefined();

      // 2. User navigates to reset link -> verify token
      const verification = verifyPasswordResetToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.email).toBe(email);

      // 3. User submits new password -> consume token & update
      consumePasswordResetToken(token);
      const updateResult = updateUserPasswordInRegistry(verification.email!, newPassword);
      expect(updateResult).toBe(true);

      // 4. Token can never be reused
      const replayAttempt = verifyPasswordResetToken(token);
      expect(replayAttempt.valid).toBe(false);

      // 5. Verify user can now authenticate with new password
      const users = getRegisteredUsers();
      const user = users.find((u) => u.email === email);
      expect(user?.password).toBe(newPassword);
      expect(user?.password).not.toBe(oldPassword);
    });
  });
});
