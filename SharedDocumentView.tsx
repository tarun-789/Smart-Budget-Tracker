// FinSight AI — Public Shared Document View
// Renders temporary shared documents for recipients with expiration enforcement and passcode verification.

import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  Download,
  AlertTriangle,
  Lock,
  ArrowLeft,
} from "lucide-react";
import {
  getShareByToken,
  incrementShareView,
} from "../services/documentShareService";
import type { DocumentShare } from "../types";

export default function SharedDocumentView() {
  const { token } = useParams<{ token: string }>();
  const [nowTimestamp] = useState(() => Date.now());

  const initialCheck = useMemo(() => {
    if (!token) return { isValid: false, reason: "Missing share link token.", share: null };
    const res = getShareByToken(token);
    if (!res.isValid || !res.share) {
      let msg = "Document link not found or invalid.";
      if (res.reason === "expired") msg = "This shared link has expired.";
      else if (res.reason === "revoked") msg = "Access to this document was revoked by the owner.";
      else if (res.reason === "view_limit_reached") msg = "This single-use link has reached its maximum view limit.";
      return { isValid: false, reason: msg, share: null };
    }
    return { isValid: true, reason: "", share: res.share };
  }, [token]);

  const [share] = useState<DocumentShare | null>(initialCheck.share);
  const [isValid] = useState<boolean>(initialCheck.isValid);
  const [failureReason] = useState<string>(initialCheck.reason);
  const [passcodeRequired] = useState<boolean>(!!initialCheck.share?.passcode);
  const [passcodeAttempt, setPasscodeAttempt] = useState<string>("");
  const [passcodeError, setPasscodeError] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!initialCheck.share?.passcode && initialCheck.isValid);

  useEffect(() => {
    if (initialCheck.isValid && token && !initialCheck.share?.passcode) {
      incrementShareView(token);
    }
  }, [initialCheck.isValid, initialCheck.share?.passcode, token]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!share) return;
    if (passcodeAttempt.trim() === share.passcode) {
      setIsUnlocked(true);
      setPasscodeError("");
      if (token) incrementShareView(token);
    } else {
      setPasscodeError("Incorrect passcode. Please check with the sender.");
    }
  };

  const handleDownload = () => {
    if (!share) return;
    const link = document.createElement("a");
    link.href = share.fileUrl;
    link.download = `${share.documentName.replace(/\s+/g, "_")}.${
      share.fileType === "pdf" ? "pdf" : "jpg"
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Expiration / Revocation Error View
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-950/50 border border-red-800/60 text-red-400 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-white mb-2">
          Document Unavailable
        </h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
          {failureReason}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold border border-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Go to FinSight AI</span>
        </Link>
      </div>
    );
  }

  // Passcode Protection Gate
  if (passcodeRequired && !isUnlocked && share) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl shadow-blue-950/40 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/50 border border-purple-800/60 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Lock size={26} />
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            Passcode Protected Document
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            The sender has protected <strong className="text-white">{share.documentName}</strong> with a passcode.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-3">
            <input
              type="password"
              value={passcodeAttempt}
              onChange={(e) => setPasscodeAttempt(e.target.value)}
              placeholder="Enter passcode"
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-center tracking-wider"
              autoFocus
              required
            />

            {passcodeError && (
              <p className="text-xs text-red-400 font-medium">
                {passcodeError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer"
            >
              Unlock Document
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Valid View
  if (!share) return null;

  const hoursRemaining = Math.max(
    0,
    Math.round(
      (new Date(share.expiresAt).getTime() - nowTimestamp) / (1000 * 60 * 60)
    )
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Navbar */}
      <header className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white">
              FinSight AI Secure Share
            </h2>
            <p className="text-[10px] text-gray-400">
              End-to-End Preserved Document
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      </header>

      {/* Expiry Banner */}
      <div className="bg-blue-950/40 border-b border-blue-800/40 px-4 py-2 flex items-center justify-between text-xs text-blue-300">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-blue-400" />
          <span>
            Viewing <strong>{share.documentName}</strong> • Temporary Link expires in ~
            <strong>{hoursRemaining} hours</strong>
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          Views: {share.viewCount + 1}
        </span>
      </div>

      {/* Document Content View */}
      <main className="flex-1 p-4 flex items-center justify-center overflow-auto">
        <div className="w-full max-w-4xl h-[78vh] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-2">
          {share.fileType === "image" ? (
            <img
              src={share.fileUrl}
              alt={share.documentName}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          ) : (
            <iframe
              src={share.fileUrl}
              title={share.documentName}
              className="w-full h-full rounded-lg border-0 bg-white"
            />
          )}
        </div>
      </main>
    </div>
  );
}
