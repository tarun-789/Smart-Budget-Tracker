import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { VoiceAssistantProvider } from "./contexts/VoiceAssistantContext";
import { VoiceAssistantModal } from "./components/voice/VoiceAssistantModal";
import { ClerkSupabaseProvider } from "./components/auth/ClerkSupabaseProvider";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Budgets from "./pages/Budgets";
import Insights from "./pages/Insights";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import Import from "./pages/Import";
import FinanceAI from "./pages/FinanceAI";
import Settings from "./pages/Settings";
import Documents from "./pages/Documents";
import SharedDocumentView from "./pages/SharedDocumentView";
import AdminPanel from "./pages/AdminPanel";
import { RequireRole } from "./components/guards/RequireRole";
// Clean up legacy mock data storage keys on boot
try {
  [
    "finsight_ai_store_v1",
    "finsight_ai_store_v2",
    "finsight_ai_store_v3",
    "finsight_ai_store_v4",
    "finsight_ai_store_v5",
  ].forEach((k) => localStorage.removeItem(k));
} catch {}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkSupabaseProvider>
        <AuthProvider>
          <BrowserRouter>
            <VoiceAssistantProvider>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/shared/:token" element={<SharedDocumentView />} />
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>

                {/* Protected */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/import" element={<Import />} />
                  <Route path="/finance-ai" element={<FinanceAI />} />
                  <Route path="/ai" element={<Navigate to="/finance-ai" replace />} />
                  <Route path="/vault" element={<Navigate to="/documents" replace />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireRole allowed={["admin"]}>
                        <AdminPanel />
                      </RequireRole>
                    }
                  />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <VoiceAssistantModal />
            </VoiceAssistantProvider>
          </BrowserRouter>
        </AuthProvider>
      </ClerkSupabaseProvider>
    </QueryClientProvider>
  );
}

export default App;
