# FinSight AI — Executive Interview Preparation Guide

> **"Understand your money. Predict your future."**  
> An AI-powered personal finance intelligence platform tailored for Indian users.

This guide provides structured, battle-tested answers to the core architectural and engineering questions for technical and behavioral interviews.

---

## 1. How did you design the AI categorization system to handle edge cases and maintain high accuracy?

### The Challenge
Indian banking statements and UPI strings are notoriously chaotic (e.g., `UPI/2348291048/SWIGGY-BANGALORE/swiggy@icici/Pay` or `POS 491290 HDFC ZOMATO GURGAON IN`). Passing raw strings directly to an LLM is slow, expensive, and error-prone.

### The Solution: 5-Tier Hybrid Pipeline
1. **User Overrides & Custom Rules (P0)**:
   - First check user-defined regex rules in `merchant_rules`.
   - If a user previously mapped `Swiggy Instamart` to `Groceries` instead of `Food & Dining`, the system immediately respects the user's intent.
2. **Deterministic Merchant Normalization (P1)**:
   - Regex-based engine strips UPI reference numbers, location suffixes, and payment gateway prefixes (`UPI/`, `POS/`, `NEFT-`).
   - Normalizes `SWIGGY*BANGALORE` → `Swiggy`, `AMZN-PAY-IN` → `Amazon Pay`.
3. **Historical Match Cache (P2)**:
   - Matches against existing normalized merchant records in the user's database.
4. **Structured LLM Inference with Gemini 1.5 Flash (P3)**:
   - For unresolved merchants, an Edge Function invokes Google Gemini 1.5 Flash using a strict JSON schema:
     ```json
     {
       "category": "Food & Dining",
       "subcategory": "Online Delivery",
       "confidence": 0.94,
       "confidence_level": "high",
       "reasoning": "Merchant identified as online food ordering platform."
     }
     ```
   - Temperature set to `0.1` for maximum determinism.
5. **Confidence Gating & Human-in-the-Loop Review (P4)**:
   - If `confidence < 0.70`, the transaction is flagged for user confirmation.
   - User correction creates an auto-rule so the system learns permanently without retraining the base model.

---

## 2. How did you ensure user financial data security and tenant isolation?

### The Architecture
1. **Database Row-Level Security (RLS)**:
   - Every one of the 20 tables in PostgreSQL enforces strict RLS policies:
     ```sql
     CREATE POLICY "Users can only access own transactions"
     ON public.transactions FOR ALL
     USING (auth.uid() = user_id);
     ```
   - Even if a frontend query omitted the `user_id` filter, PostgreSQL rejects unauthorized row access at the database kernel level.
2. **Server-Side API Key Isolation**:
   - Zero AI provider API keys (Gemini / OpenAI) exist in the browser bundle.
   - Client requests are authenticated via Supabase JWTs to Edge Functions, which securely access vault secrets.
3. **Resilient Offline-First Fallback**:
   - When running in offline or unconfigured environments, user data remains sandboxed in browser session storage and is completely reactive, preventing credential leakage over open networks.
4. **Input Sanitization & File Upload Security**:
   - Bank statement uploads (CSV, XLSX) are parsed with strict MIME-type checking and cell sanitization to prevent CSV formula injection (`=cmd|...`).

---

## 3. How did you architect the financial calculation engine to avoid floating-point errors and maintain consistency?

### Pure Functional Engine (`src/services/financialCalculations.ts`)
1. **Accounting Correctness**:
   - **Internal Transfers**: Transfers between a user's own accounts (e.g., Bank Account → Credit Card Bill Payment) are strictly excluded from income and expense aggregates to prevent artificial inflation.
   - **Refund Offsets**: Refunds are treated as negative expenses against the respective category, keeping net category burn accurate.
2. **Precision & Consistency**:
   - Financial totals use rounded half-up precision functions with decimal normalization (`Math.round((amount + Number.EPSILON) * 100) / 100`).
   - All calculation functions are pure TypeScript with zero side-effects, making them 100% deterministic and testable.
3. **Automated Verification**:
   - 15 comprehensive unit tests via Vitest testing income calculations, expense calculations, savings rate formulas, budget remaining states, and cash flow reconciliations.

---

## 4. How did you build the bank statement import pipeline to handle arbitrary formats, messy data, and duplicates?

### The 7-Stage Ingestion Pipeline
1. **File Detection & Parsing**:
   - Multi-format ingestion supporting CSV (via PapaParse) and Excel XLSX (via SheetJS) with drag-and-drop.
2. **Dynamic Header & Schema Mapping**:
   - Normalizes varying bank statement formats (HDFC format, ICICI format, SBI format) to internal schema: `Date`, `Description / Narration`, `Debit / Withdrawal`, `Credit / Deposit`, `Balance`.
3. **Transaction Parsing & Inversion Handling**:
   - Automatically identifies whether separate Debit/Credit columns or a signed single amount column are used.
4. **Multi-Factor Duplicate Detection**:
   - Compares incoming rows against existing transactions using a multi-factor similarity score:
     - Exact Amount match (+40 points)
     - Date match within ±2 days (+30 points)
     - Normalized merchant string similarity (+30 points)
     - Reference number exact match (Instant 100% duplicate flag)
5. **Interactive Staging & Reconciliation**:
   - Rows are presented in an interactive preview table. Users can review duplicates, toggle AI category suggestions, or exclude individual rows before final commit.
6. **Atomic Transaction Insertion**:
   - Confirmed transactions are committed in a batch transaction with balance recalculation.

---

## 5. How does the Anomaly Detection and Forecasting engine work?

### No Hallucinations — Grounded Mathematics
1. **Statistical Anomaly Detection (Z-Score)**:
   - Rather than relying on opaque, unpredictable AI predictions for numbers, FinSight AI computes rolling 90-day baseline statistics (mean $\mu$ and standard deviation $\sigma$) for each category.
   - For a transaction amount $x$:
     $$Z = \frac{x - \mu}{\sigma}$$
   - Any transaction where $Z > 1.5$ is flagged as an unusual spike with plain-English context (e.g., *"₹18,500 on Dining is 240% above your 90-day average of ₹5,400"*).
2. **Financial Forecasting Engine**:
   - Calculates daily burn rate across elapsed days in the current month:
     $$\text{Daily Burn} = \frac{\text{Current Month Spend}}{\text{Days Elapsed}}$$
   - Extrapolates to month end:
     $$\text{Forecasted Expense} = \text{Current Spend} + (\text{Daily Burn} \times \text{Days Remaining})$$
   - Overlays confirmed recurring commitments (EMI, rent, subscriptions) due before month end.
   - Distinguishes between fixed and discretionary burn to ensure conservative, actionable projections.

---

## 6. "Where is your data stored and how do you secure it?"

### The Direct Answer
> *"I use Supabase PostgreSQL for persistent application data and Supabase Storage for private document files. Every table enforces PostgreSQL Row Level Security (RLS) policies tied to `auth.uid()` so database records can only be accessed by their owner. Documents are stored in a private storage bucket rather than public URLs, and are further encrypted client-side using Zero-Knowledge AES-256-GCM before ever leaving the browser."*

### Key Security Layers:
1. **Kernel-Level Isolation**: Even with a direct raw SQL query, PostgreSQL evaluates `auth.uid() = user_id`.
2. **Zero-Knowledge Architecture**: The document encryption key is derived client-side via PBKDF2 with 100,000 iterations. Neither the cloud host nor database administrators can view raw documents.
3. **Private Buckets & Signed URLs**: Storage downloads require a time-limited signed token, preventing direct URL scraping.

---

## 7. "Why did you combine a Document Vault with a Personal Finance app?"

### The Product & Engineering Rationale
In real-world personal finance (especially in India), finances and sensitive documents are deeply intertwined:
- **KYC & Tax Filing**: Filing ITR requires PAN cards, Form 16, and bank statements together.
- **Insurance & Loans**: Claiming health/motor insurance or applying for loans requires policy numbers, vehicle registration, and income proof in one unified place.
- **Expiry Tracking**: Tracking expiry dates on driving licences, passports, and insurance policies prevents lapsed coverage and financial penalties.

FinSight AI eliminates the need for separate un-encrypted cloud drives by integrating a Zero-Knowledge document vault directly into the financial ledger.

---

## 8. "How does the Voice Assistant work?"

### Architecture: Voice-to-Financial-Action
1. **Speech-to-Text**: Captures user voice via browser Web Speech API (`webkitSpeechRecognition`).
2. **Deterministic Intent & Entity Extraction**:
   - Parses currency amounts (e.g. *"₹500"*, *"500 rupees"*).
   - Maps category keywords (e.g. *"lunch"*, *"burger"*, *"groceries"* → `Food & Dining`).
   - Resolves temporal phrases (e.g. *"yesterday"*, *"last month"*, *"today"*).
3. **Confirmation Gate**: Rather than blindly mutating the ledger, the assistant presents an interactive preview with an explicit confirmation step.
4. **Natural Language Queries**: Responds with real-time financial math (e.g. *"How much did I spend on food this month?"* calculates the live sum and speaks the answer).

---

## 9. "How does 'Remove Duplicate Only' work?"

### The Algorithm
1. **Multi-Factor Fingerprinting**: Generates a composite hash of `Amount + Transaction Type + Normalized Date + Normalized Narration + Account ID`.
2. **Stable Chronological Preservation**: Sorts transactions chronologically ascending. The **earliest created original record** is placed in the unique set.
3. **Selective Removal**: Subsequent occurrences with matching fingerprints are identified as redundant copies and safely deleted.
4. **Dynamic Balance Reconciliation**: All affected account balances are recomputed on the fly so the net worth reflects only real, unique transactions.

---

## 10. The 12-Step Live Demo Walkthrough (Rehearsal Script)

When an interviewer asks you to demonstrate the application, follow this exact 3-minute sequence:

1. **Open Incognito**: Go to `https://finsight-ai.vercel.app` (or `http://localhost:5173`).
2. **Register/Login**: Enter a clean user account or click **"Quick Demo"**.
3. **Add Transaction**: Click **"Add Transaction"** → enter ₹500 for Food → watch AI auto-suggest `Food & Dining` with 95% confidence.
4. **Inspect Dashboard**: Show how Total Expenses and Category Breakdown update in real-time.
5. **Demonstrate AI Insights**: Navigate to **"Insights"** → highlight the Statistical Anomaly detector and Month-End Forecast.
6. **Simulate What-If**: Slide the Food reduction slider from 0% to 20% → show projected annual savings calculation.
7. **Open Document Vault**: Navigate to **"Documents"** → explain the Zero-Knowledge AES-256 client-side encryption.
8. **Upload & Rename**: Upload a sample document → give it the custom name *"B.Tech Degree Certificate"*.
9. **Smart Search**: Search *"degree"* → show instant OCR/tag filtering.
10. **Voice Assistant**: Click microphone icon → say *"Add 350 for lunch"* → confirm and show live ledger update.
11. **Session Gate Test**: Navigate to `/login` → show the **"Already Signed In"** screen protecting the session.
12. **Multi-User Isolation**: Sign out and sign in with another account → confirm the previous user's ledger and vault are strictly segregated.

---

## Summary of Tech Stack Choices

| Component | Choice | Rationale |
|---|---|---|
| Frontend Framework | React 19 + TypeScript | Type safety across entire finance data pipeline |
| Styling | Tailwind CSS v4 + shadcn/ui | Modern, responsive dark-mode fintech SaaS UI |
| Charts & Viz | Recharts | Composable SVG financial charts with smooth animations |
| Backend & DB | Supabase (PostgreSQL) | Native RLS tenant isolation, realtime subscriptions |
| Storage & Security | Web Crypto API (AES-256-GCM) | Client-side Zero-Knowledge encryption |
| Speech Engine | Web Speech API | Zero-latency local speech recognition & synthesis |
| Testing | Vitest | Fast, native ESM unit test runner (106 tests passing) |

