// FinSight AI — Secure Personal Document Vault
// Bank-grade document vault with PIN lock, camera scanning, auto cloud backup,
// duplicate detection, document number extraction, bundle ZIP exports, and 30-day recovery bin.

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  Folder,
  Clock,
  AlertTriangle,
  Trash2,
  Download,
  Eye,
  Plus,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  Grid,
  List,
  RotateCcw,
  Mic,
  Camera,
  Package,
  CheckSquare,
  Square,
  Cloud,
  Layers,
  Copy,
} from "lucide-react";
import { useDocumentStore } from "../services/documentStore";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { useVaultSecurity } from "../services/vaultSecurityService";
import { DocumentUploadModal } from "../components/documents/DocumentUploadModal";
import { DocumentPreviewModal } from "../components/documents/DocumentPreviewModal";
import { CameraScannerModal } from "../components/documents/CameraScannerModal";
import { PinLockModal } from "../components/documents/PinLockModal";
import { DocumentBundleModal } from "../components/documents/DocumentBundleModal";
import { ZeroKnowledgeModal } from "../components/documents/ZeroKnowledgeModal";
import { KnowledgeGraphModal } from "../components/documents/KnowledgeGraphModal";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import type { VaultDocument, DocumentCategory } from "../types";
import { formatFileSize } from "../utils/formatters";

const CATEGORIES: { id: DocumentCategory | "All" | "Trash"; label: string; icon: string }[] = [
  { id: "All", label: "All Documents", icon: "📁" },
  { id: "Identity", label: "Identity", icon: "🪪" },
  { id: "Education", label: "Education", icon: "🎓" },
  { id: "Employment", label: "Employment", icon: "💼" },
  { id: "Finance", label: "Finance", icon: "💰" },
  { id: "Insurance", label: "Insurance", icon: "🛡️" },
  { id: "Medical", label: "Medical", icon: "🏥" },
  { id: "Travel", label: "Travel", icon: "✈️" },
  { id: "Personal", label: "Personal", icon: "🏠" },
  { id: "Trash", label: "Trash Bin", icon: "🗑️" },
];

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getDocuments,
    getExpiringDocuments,
    getTrashCount,
    restoreFromTrash,
    permanentDelete,
    emptyTrash,
    moveToTrash,
    backupDocumentsToCloud,
    searchSemantically,
    removeDuplicateDocuments,
  } = useDocumentStore();

  const { isUnlocked, isLocked, lockVault, unlockSession } = useVaultSecurity();
  const { openVoiceAssistant } = useVoiceAssistant();

  // Search & Filter State
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "All" | "Trash">("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Selection state for bundling
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Modals State
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState<boolean>(false);
  const [isZkModalOpen, setIsZkModalOpen] = useState<boolean>(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [pendingSensitiveDoc, setPendingSensitiveDoc] = useState<VaultDocument | null>(null);
  const [actionNotice, setActionNotice] = useState<string>("");

  // Sync search param from URL (e.g. from Voice Assistant navigation)
  const urlQuery = searchParams.get("search");
  useEffect(() => {
    if (urlQuery !== null && urlQuery !== searchQuery) {
      queueMicrotask(() => setSearchQuery(urlQuery));
    }
  }, [urlQuery, searchQuery]);

  const [nowTimestamp] = useState(() => Date.now());

  // Filtered documents list (Keyword OCR or Vector Semantic Search)
  const documents = useMemo(() => {
    if (isSemanticSearch && searchQuery.trim() && selectedCategory !== "Trash") {
      const results = searchSemantically(searchQuery);
      let docs = results.map((r) => r.document);
      if (selectedCategory !== "All") {
        docs = docs.filter((d) => d.category === selectedCategory);
      }
      return docs;
    }

    return getDocuments({
      search: searchQuery,
      category: selectedCategory,
    });
  }, [getDocuments, searchSemantically, searchQuery, selectedCategory, isSemanticSearch]);

  const expiringDocs = useMemo(() => getExpiringDocuments(), [getExpiringDocuments]);
  const trashCount = getTrashCount();

  // Detect duplicate documents (same document number or same name & category)
  const duplicateDocCount = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    for (const doc of documents) {
      if (doc.is_trash) continue;
      const numKey = doc.document_number?.trim().toLowerCase();
      const key = numKey ? `num_${numKey}` : `name_${doc.name.trim().toLowerCase()}_${doc.category}`;
      if (seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
    }
    return dupes;
  }, [documents]);

  const handleRemoveDuplicateDocs = () => {
    const res = removeDuplicateDocuments();
    if (res.removedCount > 0) {
      setActionNotice(`Cleaned ${res.removedCount} duplicate document copy! Original records were safely kept.`);
    } else {
      setActionNotice("No duplicate documents found. Vault is completely clean!");
    }
    setTimeout(() => setActionNotice(""), 4500);
  };

  // Array of currently selected VaultDocument objects
  const selectedDocuments = useMemo(() => {
    return documents.filter((d) => selectedDocIds.has(d.id));
  }, [documents, selectedDocIds]);

  const handleDocumentClick = (doc: VaultDocument) => {
    if (doc.is_trash) {
      setPreviewDoc(doc);
      return;
    }

    // Check PIN requirement for sensitive documents
    if (doc.is_sensitive && isLocked) {
      setPendingSensitiveDoc(doc);
      setIsPinModalOpen(true);
    } else {
      setPreviewDoc(doc);
    }
  };

  const handlePinSuccess = () => {
    unlockSession(5);
    if (pendingSensitiveDoc) {
      setPreviewDoc(pendingSensitiveDoc);
      setPendingSensitiveDoc(null);
    }
    setActionNotice("Vault unlocked for 5 minutes.");
    setTimeout(() => setActionNotice(""), 3000);
  };

  const toggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map((d) => d.id)));
    }
  };

  const handleBatchTrash = () => {
    selectedDocIds.forEach((id) => moveToTrash(id));
    setActionNotice(`Moved ${selectedDocIds.size} documents to Trash.`);
    setSelectedDocIds(new Set());
    setTimeout(() => setActionNotice(""), 3500);
  };

  const handleBatchBackup = () => {
    const ids = Array.from(selectedDocIds);
    const { backedUpCount } = backupDocumentsToCloud(ids.length ? ids : undefined);
    setActionNotice(`Successfully backed up ${backedUpCount} documents to cloud.`);
    setTimeout(() => setActionNotice(""), 3500);
  };

  const handleDownloadFile = (e: React.MouseEvent, doc: VaultDocument) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = doc.file_url;
    link.download = `${doc.name.replace(/\s+/g, "_")}.${
      doc.file_type === "pdf" ? "pdf" : "jpg"
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    restoreFromTrash(docId);
    setActionNotice("Document restored from Trash to Vault.");
    setTimeout(() => setActionNotice(""), 3500);
  };

  const handlePermanentDelete = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    permanentDelete(docId);
    setActionNotice("Document permanently erased from storage.");
    setTimeout(() => setActionNotice(""), 3500);
  };

  // 30-Day Trash Countdown Calculator
  const getDaysLeftInTrash = (deletedAt: string | null): number => {
    if (!deletedAt) return 30;
    const deletedTime = new Date(deletedAt).getTime();
    const purgeTime = deletedTime + 30 * 24 * 60 * 60 * 1000;
    const remainingMs = purgeTime - nowTimestamp;
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Header Section */}
      <div className="glass-card rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-1/3 w-64 h-28 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Secure Document Vault
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Permanent App Storage
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Safe permanent storage for Aadhaar, PAN, Marksheets, Licences, Policies • OCR Full-Text Search
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions: Lock status, Cloud Backup, Camera Scan, Upload */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          {/* PIN Lock Status Pill */}
          {isUnlocked ? (
            <button
              onClick={lockVault}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Session unlocked. Click to lock vault now."
            >
              <Unlock size={14} className="text-emerald-400" />
              <span>Unlocked (Lock)</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Click to enter 4-digit security PIN"
            >
              <Lock size={14} className="text-purple-400" />
              <span>PIN Protected</span>
            </button>
          )}

          {/* Zero-Knowledge Shield Modal Trigger */}
          <button
            onClick={() => setIsZkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Zero-Knowledge AES-256 Client-Side Encryption status & Recovery Kit"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Zero-Knowledge</span>
          </button>

          {/* Knowledge Graph Modal Trigger */}
          <button
            onClick={() => setIsGraphModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Explore Personal Knowledge Graph & Entity Relationships"
          >
            <Layers size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Knowledge Graph</span>
          </button>

          {/* Smart Bundles Trigger */}
          <button
            onClick={() => setIsBundleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Smart Document Bundles (Job Dossier, Travel Packet, Tax/KYC)"
          >
            <Package size={14} className="text-purple-400" />
            <span className="hidden sm:inline">Smart Bundles</span>
          </button>

          {/* 1-Click Cloud Backup Sync */}
          <button
            onClick={() => handleBatchBackup()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Synchronize all vault documents to cloud storage"
          >
            <Cloud size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Cloud Sync</span>
          </button>

          {/* Camera Scanner Button */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Scan document with camera"
          >
            <Camera size={14} className="text-purple-400" />
            <span>Scan Camera</span>
          </button>

          {/* Voice Search */}
          <button
            onClick={() => openVoiceAssistant("Find my Aadhaar document")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Voice search documents"
          >
            <Mic size={14} className="text-blue-400" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Deduplicate Documents */}
          {duplicateDocCount > 0 && (
            <button
              onClick={handleRemoveDuplicateDocs}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Clean duplicate documents, keeping earliest original"
            >
              <Copy size={14} className="text-amber-400" />
              <span>Clean Duplicates ({duplicateDocCount})</span>
            </button>
          )}

          {/* Upload Document */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-950/40 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus size={15} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Duplicate Documents Alert Banner */}
      {duplicateDocCount > 0 && selectedCategory !== "Trash" && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
              <Copy size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {duplicateDocCount} Duplicate Document{duplicateDocCount > 1 ? "s" : ""} Detected
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Redundant document files with the same document number or name were found. Clean duplicates to save storage and keep the original copies.
              </p>
            </div>
          </div>
          <button
            onClick={handleRemoveDuplicateDocs}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer self-start sm:self-auto"
          >
            Remove Duplicates Only ({duplicateDocCount})
          </button>
        </div>
      )}

      {/* Expiry Warning Banner (If Any Documents Expiring Soon) */}
      {expiringDocs.length > 0 && selectedCategory !== "Trash" && (
        <div className="p-4 bg-gradient-to-r from-amber-950/50 via-gray-900 to-gray-950 border border-amber-800/60 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  Document Expiration Notice
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {expiringDocs.length} Action Needed
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {expiringDocs
                  .map(
                    (d: VaultDocument) =>
                      `${d.name} (${
                        d.days_until_expiry ? `expires in ${d.days_until_expiry} days` : "expired"
                      })`
                  )
                  .join(" • ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expiringDocs[0] && (
              <button
                onClick={() => handleDocumentClick(expiringDocs[0])}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Inspect Expiry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar & Category Filters Toolbar */}
      <div className="glass-card rounded-2xl p-4.5 space-y-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Smart Search with OCR Full-Text & Vector Semantic Search Toggle */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchParams(e.target.value ? { search: e.target.value } : {});
                }}
                placeholder={
                  isSemanticSearch
                    ? "Semantic AI Search: e.g. 'show insurance docs', 'college certificates', 'travel papers'..."
                    : "Search documents by name, category, or OCR text (e.g. 'Aadhaar', 'degree', 'ABC University')..."
                }
                className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none transition-all ${
                  isSemanticSearch
                    ? "border-purple-500/80 focus:border-purple-400 focus:ring-1 focus:ring-purple-500/50 shadow-sm shadow-purple-950/40"
                    : "border-white/[0.08] focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchParams({});
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Semantic Vector Search Toggle */}
            <button
              onClick={() => setIsSemanticSearch(!isSemanticSearch)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex-shrink-0 ${
                isSemanticSearch
                  ? "bg-purple-600/30 text-purple-200 border-purple-500 shadow-md shadow-purple-950/50"
                  : "bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
              }`}
              title="Toggle AI Semantic Concept Search"
            >
              <Sparkles size={13} className={isSemanticSearch ? "text-purple-400 animate-pulse" : "text-gray-500"} />
              <span className="hidden sm:inline font-medium">Semantic AI</span>
            </button>
          </div>

          {/* View Mode & Multi-Select All & Trash Actions */}
          <div className="flex items-center gap-2">
            {selectedCategory !== "Trash" && documents.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.08] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {selectedDocIds.size === documents.length ? (
                  <CheckSquare size={13} className="text-blue-400" />
                ) : (
                  <Square size={13} className="text-gray-500" />
                )}
                <span>
                  {selectedDocIds.size === documents.length ? "Deselect All" : "Select All"}
                </span>
              </button>
            )}

            {selectedCategory === "Trash" && trashCount > 0 && (
              <button
                onClick={emptyTrash}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Empty Trash ({trashCount})</span>
              </button>
            )}

            <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-white/[0.06] pt-3">
          {CATEGORIES.map((cat) => {
            const isTrashTab = cat.id === "Trash";
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedDocIds(new Set());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? isTrashTab
                      ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                      : "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.08]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {isTrashTab && trashCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-950 text-red-300 font-bold">
                    {trashCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trash Notification Banner when on Trash tab */}
      {selectedCategory === "Trash" && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-400 flex-shrink-0" />
            <span>
              <strong>Recovery Vault:</strong> Deleted documents are retained for 30 days before permanent auto-purge. You can restore them anytime.
            </span>
          </div>
        </div>
      )}

      {/* Document Gallery: Empty State */}
      {documents.length === 0 && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800/80 text-gray-500 flex items-center justify-center mx-auto mb-3">
            <Folder size={28} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {selectedCategory === "Trash"
              ? "Trash is Empty"
              : searchQuery
              ? `No documents found matching "${searchQuery}"`
              : `No documents in ${selectedCategory}`}
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
            {selectedCategory === "Trash"
              ? "Deleted documents will show up here for 30 days before being permanently purged."
              : "Upload your Aadhaar, PAN, Degree Certificate, or Insurance policy to keep a permanent secure copy."}
          </p>
          {selectedCategory !== "Trash" && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsCameraOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                📸 Scan Document
              </button>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                + Upload Document
              </button>
            </div>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {documents.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc: VaultDocument) => {
            const isSelected = selectedDocIds.has(doc.id);
            const daysLeftInTrash = doc.is_trash ? getDaysLeftInTrash(doc.deleted_at) : null;

            return (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className={`group relative glass-card rounded-2xl p-4.5 shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10"
                    : "hover:border-white/20"
                }`}
              >
                <div>
                  {/* Card Top: Checkbox, Category Icon & Badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {selectedCategory !== "Trash" && (
                        <button
                          type="button"
                          onClick={(e) => toggleSelectDoc(doc.id, e)}
                          className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-indigo-400" />
                          ) : (
                            <Square size={16} className="text-gray-600 group-hover:text-gray-400" />
                          )}
                        </button>
                      )}

                      <div className="w-10 h-10 rounded-2xl bg-gray-800 border border-gray-700/60 flex items-center justify-center text-xl flex-shrink-0">
                        {doc.category === "Identity"
                          ? "🪪"
                          : doc.category === "Education"
                          ? "🎓"
                          : doc.category === "Insurance"
                          ? "🛡️"
                          : doc.category === "Employment"
                          ? "💼"
                          : doc.category === "Finance"
                          ? "💰"
                          : doc.category === "Travel"
                          ? "🛂"
                          : "📄"}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {doc.is_backed_up && (
                        <span
                          className="p-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                          title="Cloud Backed Up"
                        >
                          <Cloud size={11} />
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-gray-800 text-gray-400 border border-gray-700/60">
                        v{doc.version}
                      </span>
                      {doc.is_sensitive && (
                        <span
                          className="p-1 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/60"
                          title="Confidential PIN Protected"
                        >
                          <Lock size={11} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document Title */}
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {doc.name}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {doc.original_filename}
                  </p>

                  {/* Extracted Document Number Badge */}
                  {doc.document_number && (
                    <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[10px] text-blue-300 font-mono">
                      <span className="text-gray-400 uppercase text-[9px]">
                        {doc.document_number_type || "ID"}:
                      </span>
                      <span className="font-bold truncate">{doc.document_number}</span>
                    </div>
                  )}

                  {/* Expiry Pill */}
                  {doc.expiry_date && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          doc.expiry_status === "expired"
                            ? "bg-red-950/60 text-red-300 border-red-800/60"
                            : doc.expiry_status === "expires_soon"
                            ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                            : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        }`}
                      >
                        <Clock size={10} />
                        <span>
                          {doc.expiry_status === "expired"
                            ? "Expired"
                            : doc.expiry_status === "expires_soon"
                            ? `Expires in ${doc.days_until_expiry}d`
                            : "Valid"}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Trash 30-Day Countdown Pill */}
                  {doc.is_trash && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60">
                        <Trash2 size={10} />
                        <span>{daysLeftInTrash} days until permanent erase</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span className="text-[11px] font-mono">
                    {formatFileSize(doc.file_size)}
                  </span>

                  <div className="flex items-center gap-1">
                    {selectedCategory === "Trash" ? (
                      <>
                        <button
                          onClick={(e) => handleRestore(e, doc.id)}
                          className="p-1.5 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/40 transition-colors cursor-pointer"
                          title="Restore Document"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(e, doc.id)}
                          className="p-1.5 text-red-400 hover:text-white rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
                          title="Delete Permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleDownloadFile(e, doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Download Permanent Copy"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDocumentClick(doc)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {documents.length > 0 && viewMode === "list" && (
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 border-b border-white/[0.08] text-gray-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                {selectedCategory !== "Trash" && <th className="p-3.5 w-10"></th>}
                <th className="p-3.5">Document Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Document ID</th>
                <th className="p-3.5">File Specs</th>
                <th className="p-3.5">Expiry / Retention</th>
                <th className="p-3.5">Version</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {documents.map((doc: VaultDocument) => {
                const isSelected = selectedDocIds.has(doc.id);
                const daysLeftInTrash = doc.is_trash ? getDaysLeftInTrash(doc.deleted_at) : null;

                return (
                  <tr
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc)}
                    className={`hover:bg-gray-800/40 transition-colors cursor-pointer ${
                      isSelected ? "bg-indigo-950/20" : ""
                    }`}
                  >
                    {selectedCategory !== "Trash" && (
                      <td className="p-3.5" onClick={(e) => toggleSelectDoc(doc.id, e)}>
                        <button type="button" className="p-1 text-gray-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare size={15} className="text-indigo-400" />
                          ) : (
                            <Square size={15} className="text-gray-600" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">
                          {doc.category === "Identity"
                            ? "🪪"
                            : doc.category === "Education"
                            ? "🎓"
                            : doc.category === "Insurance"
                            ? "🛡️"
                            : "📄"}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-white">{doc.name}</p>
                            {doc.is_sensitive && (
                              <Lock size={11} className="text-purple-400" />
                            )}
                            {doc.is_backed_up && (
                              <Cloud size={11} className="text-emerald-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {doc.original_filename}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300 font-medium">
                        {doc.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-blue-300">
                      {doc.document_number || "—"}
                    </td>
                    <td className="p-3.5 text-gray-400 font-mono">
                      {formatFileSize(doc.file_size)} • {doc.file_type.toUpperCase()}
                    </td>
                    <td className="p-3.5">
                      {doc.is_trash ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60">
                          {daysLeftInTrash}d left
                        </span>
                      ) : doc.expiry_date ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            doc.expiry_status === "expired"
                              ? "bg-red-950/60 text-red-300 border-red-800/60"
                              : doc.expiry_status === "expires_soon"
                              ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                          }`}
                        >
                          {doc.expiry_status === "expired"
                            ? "Expired"
                            : doc.expiry_status === "expires_soon"
                            ? `Expires in ${doc.days_until_expiry}d`
                            : "Valid"}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">No Expiry</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-gray-800 text-gray-300">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {selectedCategory === "Trash" ? (
                          <>
                            <button
                              onClick={(e) => handleRestore(e, doc.id)}
                              className="p-1.5 text-emerald-400 hover:text-white rounded hover:bg-gray-800"
                              title="Restore"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={(e) => handlePermanentDelete(e, doc.id)}
                              className="p-1.5 text-red-400 hover:text-white rounded hover:bg-gray-800"
                              title="Permanent Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleDownloadFile(e, doc)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 rounded hover:bg-gray-800"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleDocumentClick(doc)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                            >
                              Preview
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Multi-Select Action Bar */}
      {selectedDocIds.size > 0 && selectedCategory !== "Trash" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 border border-indigo-500/50 backdrop-blur-md rounded-2xl px-5 py-3 shadow-2xl shadow-indigo-950/60 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">
              {selectedDocIds.size}
            </span>
            <span>Documents Selected</span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBundleModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/50 cursor-pointer"
            >
              <Package size={13} />
              <span>Create Bundle (.ZIP)</span>
            </button>

            <button
              onClick={handleBatchBackup}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Cloud size={13} />
              <span>Cloud Backup</span>
            </button>

            <button
              onClick={handleBatchTrash}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Trash</span>
            </button>

            <button
              onClick={() => setSelectedDocIds(new Set())}
              className="text-xs text-gray-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(_docId: string) => {
          setActionNotice("Document uploaded and securely encrypted in vault!");
          setTimeout(() => setActionNotice(""), 3500);
        }}
      />

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onDocumentAdded={(name: string) => {
          setActionNotice(`Scanned photo "${name}" saved to vault!`);
          setTimeout(() => setActionNotice(""), 3500);
        }}
      />

      {/* PIN Lock Keypad Modal */}
      <PinLockModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingSensitiveDoc(null);
        }}
        onSuccess={handlePinSuccess}
      />

      {/* Multi-Document Bundle Modal */}
      <DocumentBundleModal
        documents={selectedDocuments}
        allVaultDocuments={getDocuments()}
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        onClearSelection={() => setSelectedDocIds(new Set())}
      />

      {/* Zero-Knowledge AES-256 Management Modal */}
      <ZeroKnowledgeModal
        isOpen={isZkModalOpen}
        onClose={() => setIsZkModalOpen(false)}
      />

      {/* Personal Knowledge Graph Visualizer Modal */}
      <KnowledgeGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        documents={getDocuments()}
        onSelectDocument={(doc) => setPreviewDoc(doc)}
      />

      {/* Preview Modal with Error Boundary protection */}
      <ErrorBoundary
        fallbackTitle="Document Viewer Error"
        onReset={() => setPreviewDoc(null)}
      >
        <DocumentPreviewModal
          document={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          onTrash={(_docId: string) => {
            setActionNotice("Document moved to Trash (recoverable for 30 days).");
            setTimeout(() => setActionNotice(""), 3500);
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
