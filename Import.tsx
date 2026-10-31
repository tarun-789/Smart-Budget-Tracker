import React, { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Database,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useFinanceStore } from "../services/dataStore";
import { normalizeMerchant, suggestCategoryFromMerchant } from "../services/merchantService";
import { isLikelyDuplicate } from "../services/duplicateDetection";
import { formatINR } from "../utils/formatters";
import type { TransactionType } from "../types";

interface ParsedRow {
  id: string;
  rawDate: string;
  rawDescription: string;
  rawAmount: number;
  type: TransactionType;
  normalizedMerchant: string;
  suggestedCategory: string;
  categoryId: string | null;
  confidence: number;
  isDuplicate: boolean;
  duplicateScore: number;
  duplicateReasons: string[];
  selected: boolean;
}

export default function Import() {
  const { accounts, categories, transactions, addTransaction } = useFinanceStore();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
  const [stage, setStage] = useState<"upload" | "preview" | "importing" | "success">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importSummary, setImportSummary] = useState({ total: 0, imported: 0, duplicatesSkipped: 0 });

  // Sample Data Generator for 1-click test
  const loadSampleStatement = (bankName: string) => {
    let sampleCSV = "";
    if (bankName === "HDFC") {
      sampleCSV = `Date,Narration,Chq/Ref No,Withdrawal Amt,Deposit Amt,Closing Balance
01/09/2026,ACH CR-INFOSYS SALARY-001,HDFC992110,,85000.00,142500.00
03/09/2026,UPI-SWIGGY RESTAURANTS-SWG881,UPI882910,750.00,,141750.00
04/09/2026,POS 402123 DMART RETAIL BLR,POS0012,3820.00,,137930.00
06/09/2026,UPI-UBER INDIA TECHNOLOGIES,UBR1120,290.00,,137640.00
08/09/2026,NEFT DR-BESCOM ELECTRICITY,BSC88190,1950.00,,135690.00
10/09/2026,NETFLIX INDIA SUBSCRIPTION,REC-NTFLX-09,649.00,,135041.00`;
    } else {
      sampleCSV = `Txn Date,Description,Ref Number,Debit,Credit
02/09/2026,AMAZON PAY INDIA ONLINE,AMZ-9912,2499.00,
05/09/2026,AIRTEL BROADBAND FIBER BILL,ATL-0091,1099.00,
07/09/2026,ZERODHA BROKING MUTUAL FUND,ZERODHA-SIP,10000.00,
09/09/2026,BIGBASKET GROCERY DELIVERY,BB-44102,1850.00,
11/09/2026,ZOMATO FOOD ORDER REFUND,ZMT-REF-01,,420.00`;
    }

    setFileName(`${bankName}_Statement_Sep2026.csv`);
    processCSVContent(sampleCSV);
  };

  // Handle File Upload (CSV or Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        processCSVContent(text);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        processCSVContent(csv);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Pipeline: Parse -> Normalize -> Detect Duplicates -> Categorize
  const processCSVContent = (csvText: string) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rawData = results.data as Record<string, string>[];
        const rows: ParsedRow[] = [];

        rawData.forEach((r, idx) => {
          // Normalize column headers
          const dateVal = r["Date"] || r["Txn Date"] || r["Transaction Date"] || r["Value Date"] || new Date().toISOString().split("T")[0];
          const descVal = r["Narration"] || r["Description"] || r["Particulars"] || r["Remarks"] || "Transaction";
          const debitVal = parseFloat(r["Withdrawal Amt"] || r["Debit"] || r["Withdrawal"] || "0") || 0;
          const creditVal = parseFloat(r["Deposit Amt"] || r["Credit"] || r["Deposit"] || "0") || 0;
          const amtVal = parseFloat(r["Amount"] || "0") || 0;

          let type: TransactionType = "expense";
          let finalAmt = 0;

          if (creditVal > 0) {
            type = "income";
            finalAmt = creditVal;
          } else if (debitVal > 0) {
            type = "expense";
            finalAmt = debitVal;
          } else if (amtVal !== 0) {
            type = amtVal > 0 ? "income" : "expense";
            finalAmt = Math.abs(amtVal);
          } else {
            return;
          }

          // Step 12: Merchant Normalization
          const norm = normalizeMerchant(descVal);

          // Step 14: AI Categorization Suggestion
          const catName = suggestCategoryFromMerchant(norm.normalized_name);
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === (catName || "").toLowerCase()
          );

          // Step 13: Duplicate Detection
          const dupCheck = isLikelyDuplicate(
            {
              amount: finalAmt,
              transaction_date: dateVal.includes("/")
                ? dateVal.split("/").reverse().join("-")
                : dateVal,
              description: descVal,
              account_id: selectedAccountId,
              reference_number: r["Chq/Ref No"] || r["Ref Number"] || null,
              transaction_type: type,
            },
            transactions,
            0.70
          );

          rows.push({
            id: `row-${idx}`,
            rawDate: dateVal,
            rawDescription: descVal,
            rawAmount: finalAmt,
            type,
            normalizedMerchant: norm.normalized_name,
            suggestedCategory: matchedCategory?.name || (type === "income" ? "Income" : "Other"),
            categoryId: matchedCategory?.id || (type === "income" ? "cat-12" : "cat-13"),
            confidence: norm.confidence,
            isDuplicate: dupCheck.isDuplicate,
            duplicateScore: Math.round(dupCheck.score * 100),
            duplicateReasons: dupCheck.isDuplicate ? ["Similar amount & date match existing transaction"] : [],
            selected: !dupCheck.isDuplicate, // auto-uncheck suspected duplicates
          });
        });

        setParsedRows(rows);
        setStage("preview");
      },
    });
  };

  // Commit selected rows to dataStore
  const handleConfirmImport = () => {
    setStage("importing");
    const selected = parsedRows.filter((r) => r.selected);
    let count = 0;

    selected.forEach((r) => {
      // Clean ISO date format
      let formattedDate = r.rawDate;
      if (formattedDate.includes("/")) {
        const parts = formattedDate.split("/");
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      addTransaction({
        user_id: "current-user",
        account_id: selectedAccountId,
        merchant_id: null,
        amount: r.rawAmount,
        currency: "INR",
        transaction_type: r.type,
        category_id: r.categoryId,
        subcategory_id: null,
        transaction_date: formattedDate,
        payment_method: r.rawDescription.toLowerCase().includes("upi") ? "upi" : "net_banking",
        description: r.normalizedMerchant || r.rawDescription,
        reference_number: "IMP-" + Math.floor(100000 + Math.random() * 900000),
        is_recurring: r.normalizedMerchant === "Netflix" || r.rawDescription.toLowerCase().includes("salary"),
        is_duplicate: false,
        ai_confidence: r.confidence,
        notes: `Imported from ${fileName}`,
      });
      count++;
    });

    setImportSummary({
      total: parsedRows.length,
      imported: count,
      duplicatesSkipped: parsedRows.length - count,
    });
    setStage("success");
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Import & Connect</h1>
        <p className="text-gray-400 text-sm mt-1">
          Import transactions from bank statements with automated entity extraction, duplicate prevention and AI categorization
        </p>
      </div>

      {/* Target Account Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">Target Account:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatINR(a.balance)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>Automatic Indian Merchant Normalization & Duplicate Detection Active</span>
        </div>
      </div>

      {/* STAGE 1: Upload & Sample Files */}
      {stage === "upload" && (
        <div className="space-y-6">
          {/* Drag & Drop Card */}
          <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 bg-gray-900/50 rounded-2xl p-10 text-center transition-colors">
            <div className="w-16 h-16 bg-blue-950/60 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Upload Your Bank Statement</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Drag and drop your statement file here, or click to browse. Supports <strong>CSV</strong> and <strong>Excel (.xlsx, .xls)</strong> formats from all Indian banks.
            </p>
            <label className="cursor-pointer px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 inline-flex items-center gap-2">
              <Upload size={16} />
              Choose File to Import
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick 1-Click Samples for Instant Testing */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-400" />
              <h3 className="text-base font-bold text-white">Instant Testing with Real Bank Formats</h3>
            </div>
            <p className="text-gray-400 text-xs">
              Don't have a statement handy? Click below to instantly load and test the pipeline with authentic Indian bank statement layouts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => loadSampleStatement("HDFC")}
                className="p-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-blue-500/50 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-blue-400" />
                    HDFC Bank Statement (CSV)
                  </span>
                  <ArrowRight size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <p className="text-xs text-gray-400">
                  Standard format with Narration, Chq/Ref No, Withdrawal & Deposit columns.
                </p>
              </button>

              <button
                onClick={() => loadSampleStatement("ICICI")}
                className="p-4 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-blue-500/50 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400" />
                    ICICI / Credit Card Statement (CSV)
                  </span>
                  <ArrowRight size={16} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-xs text-gray-400">
                  Includes Amazon, Airtel, Zerodha SIP and refund transactions.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: Staging Table & Duplicate Review (Steps 10, 12, 13, 14) */}
      {stage === "preview" && (
        <div className="space-y-5">
          {/* Staging stats bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase font-semibold">Total Rows Parsed</p>
              <p className="text-2xl font-bold text-white mt-1">{parsedRows.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase font-semibold">Ready to Import</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {parsedRows.filter((r) => r.selected).length}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase font-semibold">Suspected Duplicates</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {parsedRows.filter((r) => r.isDuplicate).length}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase font-semibold">Normalized Entities</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {parsedRows.filter((r) => r.normalizedMerchant !== r.rawDescription).length}
              </p>
            </div>
          </div>

          {/* Staging Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Review Staged Transactions</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Verify extracted merchants, AI categories, and duplicate flags before committing
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStage("upload")}
                  className="px-3.5 py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Discard & Re-upload
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
                >
                  Commit {parsedRows.filter((r) => r.selected).length} Transactions →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center">Import</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Raw Description</th>
                    <th className="py-3 px-4">Normalized Merchant</th>
                    <th className="py-3 px-4">AI Category</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">AI Confidence</th>
                    <th className="py-3 px-4 text-center">Duplicate Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-xs">
                  {parsedRows.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-800/40 transition-colors ${
                        r.isDuplicate ? "bg-amber-950/15" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={(e) => {
                            const updated = parsedRows.map((row) =>
                              row.id === r.id ? { ...row, selected: e.target.checked } : row
                            );
                            setParsedRows(updated);
                          }}
                          className="rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">{r.rawDate}</td>

                      {/* Raw Description */}
                      <td className="py-3 px-4 text-gray-300 max-w-xs truncate" title={r.rawDescription}>
                        {r.rawDescription}
                      </td>

                      {/* Normalized Merchant (Step 12) */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                          {r.normalizedMerchant}
                        </span>
                      </td>

                      {/* AI Category (Step 14) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-blue-950/60 text-blue-300 border border-blue-800/50 rounded-lg text-xs font-medium">
                          {r.suggestedCategory}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-semibold">
                        <span className={r.type === "income" ? "text-emerald-400" : "text-white"}>
                          {r.type === "income" ? "+" : "-"}
                          {formatINR(r.rawAmount)}
                        </span>
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-emerald-400 font-semibold">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </td>

                      {/* Duplicate Status (Step 13) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-900/40 text-amber-300 border border-amber-700/50 rounded-full text-[10px] font-semibold">
                            <AlertTriangle size={11} /> Likely Duplicate ({r.duplicateScore}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                            <CheckCircle2 size={12} /> New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Success Confirmation Screen */}
      {stage === "success" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-900/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl">
            ✓
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Import Successfully Completed!</h2>
            <p className="text-gray-400 text-sm mt-1">
              Your statements were parsed, categorized, and added to your portfolio.
            </p>
          </div>

          <div className="p-4 bg-gray-800/60 rounded-xl space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Rows Processed:</span>
              <span className="font-semibold text-white">{importSummary.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Transactions Added:</span>
              <span className="font-semibold text-emerald-400">+{importSummary.imported}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duplicates Skipped:</span>
              <span className="font-semibold text-amber-400">{importSummary.duplicatesSkipped}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStage("upload")}
              className="flex-1 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-medium transition-colors"
            >
              Import Another File
            </button>
            <a
              href="/dashboard"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
            >
              Go to Dashboard →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
