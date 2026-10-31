import { describe, it, expect, beforeEach } from "vitest";
import {
  registerLoginSession,
  getUserSessions,
  revokeSession,
  revokeAllUserSessions,
  addSimulatedDeviceSession,
  formatRelativeTime,
  pingCurrentSession,
} from "../services/deviceSessionService";

describe("Device Session Tracking & Remote Sign-Out Service", () => {
  const USER_A = "user-alice-123";
  const USER_B = "user-bob-456";
  const EMAIL_A = "alice@gmail.com";
  const EMAIL_B = "bob@gmail.com";

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("registerLoginSession", () => {
    it("registers an active session with device metadata and timestamps", () => {
      const session = registerLoginSession(USER_A, EMAIL_A);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(USER_A);
      expect(session.email).toBe(EMAIL_A);
      expect(session.deviceName).toBeDefined();
      expect(session.browserName).toBeDefined();
      expect(session.osName).toBeDefined();
      expect(session.isCurrentSession).toBe(true);
      expect(session.loginAt).toBeDefined();
      expect(session.lastActiveAt).toBeDefined();
    });

    it("persists sessions to storage and keeps only current session marked active", () => {
      const sess1 = registerLoginSession(USER_A, EMAIL_A);
      expect(sess1.isCurrentSession).toBe(true);

      const sessions = getUserSessions(USER_A);
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBe(sess1.id);
      expect(sessions[0].isCurrentSession).toBe(true);
    });
  });

  describe("User Isolation (Device details shown to that user only)", () => {
    it("ensures User A only sees their own device sessions, not User B's", () => {
      registerLoginSession(USER_A, EMAIL_A);
      addSimulatedDeviceSession(USER_A, EMAIL_A, "iphone");

      registerLoginSession(USER_B, EMAIL_B);
      addSimulatedDeviceSession(USER_B, EMAIL_B, "macbook");

      const aliceSessions = getUserSessions(USER_A);
      const bobSessions = getUserSessions(USER_B);

      // Alice only sees Alice's sessions
      expect(aliceSessions.every((s) => s.userId === USER_A)).toBe(true);
      expect(aliceSessions.some((s) => s.userId === USER_B)).toBe(false);

      // Bob only sees Bob's sessions
      expect(bobSessions.every((s) => s.userId === USER_B)).toBe(true);
      expect(bobSessions.some((s) => s.userId === USER_A)).toBe(false);
    });
  });

  describe("Remote Device Sign Out (revokeSession)", () => {
    it("allows signing out of a remote device session by ID", () => {
      // 1. Current login
      registerLoginSession(USER_A, EMAIL_A);

      // 2. User logged in on another device (e.g. iPhone)
      const remoteDevice = addSimulatedDeviceSession(USER_A, EMAIL_A, "iphone");
      expect(remoteDevice.isCurrentSession).toBe(false);

      let sessions = getUserSessions(USER_A);
      expect(sessions.length).toBe(2);

      // 3. User clicks 'Sign Out' on the remote iPhone session
      const revoked = revokeSession(remoteDevice.id, USER_A);
      expect(revoked).toBe(true);

      // 4. Remote session is removed; current session remains active
      sessions = getUserSessions(USER_A);
      expect(sessions.length).toBe(1);
      expect(sessions.find((s) => s.id === remoteDevice.id)).toBeUndefined();
      expect(sessions[0].isCurrentSession).toBe(true);
    });

    it("returns false if trying to revoke a non-existent or other user's session", () => {
      registerLoginSession(USER_A, EMAIL_A);
      const bobRemote = addSimulatedDeviceSession(USER_B, EMAIL_B, "android");

      // Alice cannot revoke Bob's session
      const unauthorizedRevoke = revokeSession(bobRemote.id, USER_A);
      expect(unauthorizedRevoke).toBe(false);

      // Bob's session is untouched
      expect(getUserSessions(USER_B).length).toBe(1);
    });
  });

  describe("revokeAllUserSessions (Sign Out from all devices)", () => {
    it("clears all sessions for that user on full sign-out", () => {
      registerLoginSession(USER_A, EMAIL_A);
      addSimulatedDeviceSession(USER_A, EMAIL_A, "iphone");
      addSimulatedDeviceSession(USER_A, EMAIL_A, "macbook");

      registerLoginSession(USER_B, EMAIL_B);

      expect(getUserSessions(USER_A).length).toBe(3);
      expect(getUserSessions(USER_B).length).toBe(1);

      revokeAllUserSessions(USER_A);

      expect(getUserSessions(USER_A).length).toBe(0);
      // Bob's session still exists
      expect(getUserSessions(USER_B).length).toBe(1);
    });
  });

  describe("Heartbeat and Relative Time Formatter", () => {
    it("updates lastActiveAt on pingCurrentSession", () => {
      const sess = registerLoginSession(USER_A, EMAIL_A);
      const initialActive = sess.lastActiveAt;

      // Small tick
      pingCurrentSession(USER_A);
      const updated = getUserSessions(USER_A)[0];
      expect(new Date(updated.lastActiveAt).getTime()).toBeGreaterThanOrEqual(
        new Date(initialActive).getTime()
      );
    });

    it("formats relative timestamps correctly", () => {
      const justNow = new Date().toISOString();
      expect(formatRelativeTime(justNow)).toBe("Just now");

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatRelativeTime(tenMinutesAgo)).toBe("10 min ago");

      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");

      const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
    });
  });
});
