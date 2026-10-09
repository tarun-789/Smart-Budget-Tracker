import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { financeStore } from "../services/dataStore";
import { documentVaultStore } from "../services/documentStore";
import {
  type RegisteredUser,
  ACTIVE_USER_SESSION_KEY,
  LOCAL_DEMO_USER_KEY,
  getRegisteredUsers,
  saveRegisteredUsers,
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  updateUserPasswordInRegistry,
} from "../services/authRegistry";
import {
  getStoredRotationState,
  rotateRefreshToken,
  resetRotationState,
} from "../utils/authUtils";
import { validateEmail } from "../utils/emailValidator";
import {
  registerLoginSession,
  revokeAllUserSessions,
} from "../services/deviceSessionService";
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  isDemoMode: boolean;
  registeredUsers: RegisteredUser[];
  roles: string[];
  activeRole: "admin" | "user" | "analyst";
  switchRole: (role: "admin" | "user" | "analyst") => void;
  accessToken: string;
  refreshToken: string;
  rotateTokens: () => { success: boolean; isTheftDetected: boolean; message: string };
  triggerReplayAttack: () => { success: boolean; message: string };
  isSessionRevoked: boolean;
  sessionRevocationReason?: string;
  resetSessionSecurity: () => void;
  getClerkToken: () => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signInDemo: (fullName?: string, email?: string) => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null; resetUrl?: string; token?: string }>;
