// FinSight AI — Natural Language Financial Intent Parser
// Converts spoken or typed phrases into structured financial action schemas.

import {
  extractMultilingualAmount,
  extractMultilingualDate,
  extractMultilingualCategory,
  extractMultilingualTxType,
  extractMultilingualQuery,
  detectConversationalCorrection,
  getMultilingualResponseTemplate,
} from "../multilingual/multilingualDictionary";
import { detectLanguage, type DetectionResult } from "../multilingual/multilingualDetector";

export type VoiceActionType =
  | "add_transaction"
  | "delete_last_transaction"
  | "delete_specific_transaction"
  | "update_budget"
  | "create_goal"
  | "query_spending"
  | "check_budget"
  | "filter_transactions"
  | "find_document"
  | "query_document_expiry"
  | "create_document_bundle"
  | "confirm"
  | "cancel"
  | "correction"
  | "unknown";

export interface ParsedVoiceIntent {
  action: VoiceActionType;
  rawText: string;
  confidence: number;
  detectedLanguage?: DetectionResult;
  // Document Vault payload
  documentQuery?: string;
  documentCategory?: string;
  bundleType?: "job" | "travel" | "tax" | "custom";
  // Transaction payload
  type?: "expense" | "income" | "transfer" | "refund" | "investment";
  amount?: number;
  category?: string;
  subcategory?: string;
  date?: string; // YYYY-MM-DD
  description?: string;
  paymentMethod?: string;
  // Goal / Budget payload
  targetAmount?: number;
  goalName?: string;
  budgetName?: string;
  // Query / Filter payload
  queryScope?: "today" | "yesterday" | "this_month" | "last_month" | "category" | "general";
  targetDate?: string;
  // Deletion specifics
  deleteTarget?: {
    amount?: number;
    category?: string;
    description?: string;
  };
  spokenPrompt?: string;
  explanation?: string;
}

// Category keyword mappings for Indian fintech users
const CATEGORY_MAP: Record<string, { category: string; defaultSub?: string; icon: string }> = {
  // Food & Dining
  food: { category: "Food", icon: "🍔" },
  lunch: { category: "Food", defaultSub: "Lunch", icon: "🍔" },
  dinner: { category: "Food", defaultSub: "Dinner", icon: "🍔" },
  breakfast: { category: "Food", defaultSub: "Breakfast", icon: "🍔" },
  snacks: { category: "Food", defaultSub: "Snacks", icon: "🍔" },
  coffee: { category: "Food", defaultSub: "Cafe & Drinks", icon: "☕" },
  tea: { category: "Food", defaultSub: "Chai & Snacks", icon: "☕" },
  cafe: { category: "Food", defaultSub: "Cafe", icon: "☕" },
  starbucks: { category: "Food", defaultSub: "Coffee", icon: "☕" },
  restaurant: { category: "Food", defaultSub: "Dining Out", icon: "🍽️" },
  swiggy: { category: "Food", defaultSub: "Food Delivery", icon: "🍔" },
  zomato: { category: "Food", defaultSub: "Food Delivery", icon: "🍔" },
  mcdonalds: { category: "Food", defaultSub: "Fast Food", icon: "🍔" },
  burger: { category: "Food", defaultSub: "Fast Food", icon: "🍔" },
  pizza: { category: "Food", defaultSub: "Fast Food", icon: "🍕" },
  dominos: { category: "Food", defaultSub: "Pizza", icon: "🍕" },

  // Groceries
  groceries: { category: "Groceries", icon: "🥦" },
  grocery: { category: "Groceries", icon: "🥦" },
  vegetables: { category: "Groceries", defaultSub: "Vegetables", icon: "🥦" },
  fruits: { category: "Groceries", defaultSub: "Fruits", icon: "🍎" },
  milk: { category: "Groceries", defaultSub: "Dairy", icon: "🥛" },
  supermarket: { category: "Groceries", icon: "🛒" },
  zepto: { category: "Groceries", defaultSub: "Quick Commerce", icon: "⚡" },
  blinkit: { category: "Groceries", defaultSub: "Quick Commerce", icon: "⚡" },
  instamart: { category: "Groceries", defaultSub: "Quick Commerce", icon: "⚡" },
  bigbasket: { category: "Groceries", defaultSub: "Grocery Delivery", icon: "🛒" },

  // Transportation
  uber: { category: "Transportation", defaultSub: "Uber Cab", icon: "🚗" },
  ola: { category: "Transportation", defaultSub: "Ola Cab", icon: "🚗" },
  cab: { category: "Transportation", defaultSub: "Cab / Taxi", icon: "🚕" },
  taxi: { category: "Transportation", defaultSub: "Cab / Taxi", icon: "🚕" },
  auto: { category: "Transportation", defaultSub: "Auto Rickshaw", icon: "🛺" },
  rapido: { category: "Transportation", defaultSub: "Bike Taxi", icon: "🛵" },
  petrol: { category: "Transportation", defaultSub: "Fuel", icon: "⛽" },
  diesel: { category: "Transportation", defaultSub: "Fuel", icon: "⛽" },
  fuel: { category: "Transportation", defaultSub: "Fuel", icon: "⛽" },
  metro: { category: "Transportation", defaultSub: "Metro Rail", icon: "🚇" },
  bus: { category: "Transportation", defaultSub: "Bus Fare", icon: "🚌" },
  train: { category: "Transportation", defaultSub: "Train Ticket", icon: "🚆" },
  flight: { category: "Transportation", defaultSub: "Air Travel", icon: "✈️" },
  parking: { category: "Transportation", defaultSub: "Parking Fee", icon: "🅿️" },
  toll: { category: "Transportation", defaultSub: "Fastag / Toll", icon: "🛣️" },
  transport: { category: "Transportation", icon: "🚗" },
  transportation: { category: "Transportation", icon: "🚗" },

  // Bills & Utilities
  electricity: { category: "Bills", defaultSub: "Electricity Bill", icon: "⚡" },
  power: { category: "Bills", defaultSub: "Electricity", icon: "⚡" },
  water: { category: "Bills", defaultSub: "Water Utility", icon: "💧" },
  wifi: { category: "Bills", defaultSub: "Broadband Internet", icon: "📶" },
  broadband: { category: "Bills", defaultSub: "Broadband Internet", icon: "📶" },
  internet: { category: "Bills", defaultSub: "Internet", icon: "🌐" },
  mobile: { category: "Bills", defaultSub: "Mobile Recharge", icon: "📱" },
  recharge: { category: "Bills", defaultSub: "Mobile Recharge", icon: "📱" },
  dth: { category: "Bills", defaultSub: "DTH / TV", icon: "📺" },
  gas: { category: "Bills", defaultSub: "LPG Gas Cylinder", icon: "🔥" },
  bill: { category: "Bills", icon: "📄" },
  bills: { category: "Bills", icon: "📄" },
  utility: { category: "Bills", icon: "📄" },

  // Shopping
  shopping: { category: "Shopping", icon: "🛍️" },
  clothes: { category: "Shopping", defaultSub: "Apparel", icon: "👕" },
  clothing: { category: "Shopping", defaultSub: "Apparel", icon: "👗" },
  shoes: { category: "Shopping", defaultSub: "Footwear", icon: "👟" },
  amazon: { category: "Shopping", defaultSub: "E-Commerce", icon: "📦" },
  flipkart: { category: "Shopping", defaultSub: "E-Commerce", icon: "📦" },
  myntra: { category: "Shopping", defaultSub: "Fashion", icon: "🛍️" },
  zara: { category: "Shopping", defaultSub: "Fashion", icon: "🛍️" },
  h_and_m: { category: "Shopping", defaultSub: "Fashion", icon: "🛍️" },
  electronics: { category: "Shopping", defaultSub: "Gadgets", icon: "💻" },
  gadget: { category: "Shopping", defaultSub: "Electronics", icon: "📱" },
  laptop: { category: "Shopping", defaultSub: "Electronics", icon: "💻" },

  // Housing
  rent: { category: "Housing", defaultSub: "House Rent", icon: "🏠" },
  housing: { category: "Housing", icon: "🏠" },
  maintenance: { category: "Housing", defaultSub: "Society Maintenance", icon: "🛠️" },
  maid: { category: "Housing", defaultSub: "Domestic Help", icon: "🧹" },
  cook: { category: "Housing", defaultSub: "Domestic Help", icon: "🍳" },

  // Entertainment
  entertainment: { category: "Entertainment", icon: "🎬" },
  movies: { category: "Entertainment", defaultSub: "Cinema", icon: "🍿" },
  movie: { category: "Entertainment", defaultSub: "Cinema", icon: "🍿" },
  cinema: { category: "Entertainment", defaultSub: "Cinema", icon: "🍿" },
  pvr: { category: "Entertainment", defaultSub: "Cinema", icon: "🍿" },
  netflix: { category: "Entertainment", defaultSub: "Subscription", icon: "📺" },
  spotify: { category: "Entertainment", defaultSub: "Music Subscription", icon: "🎵" },
  prime: { category: "Entertainment", defaultSub: "Subscription", icon: "📺" },
  hotstar: { category: "Entertainment", defaultSub: "OTT Subscription", icon: "📺" },
  gaming: { category: "Entertainment", defaultSub: "Video Games", icon: "🎮" },

  // Healthcare
  healthcare: { category: "Healthcare", icon: "🏥" },
  health: { category: "Healthcare", icon: "🏥" },
  hospital: { category: "Healthcare", defaultSub: "Hospital Care", icon: "🏥" },
  doctor: { category: "Healthcare", defaultSub: "Doctor Consultation", icon: "🩺" },
  clinic: { category: "Healthcare", defaultSub: "Doctor Consultation", icon: "🩺" },
  medicine: { category: "Healthcare", defaultSub: "Pharmacy", icon: "💊" },
  medicines: { category: "Healthcare", defaultSub: "Pharmacy", icon: "💊" },
  pharmacy: { category: "Healthcare", defaultSub: "Pharmacy", icon: "💊" },
  apollo: { category: "Healthcare", defaultSub: "Pharmacy", icon: "💊" },
  test: { category: "Healthcare", defaultSub: "Diagnostics", icon: "🧪" },
  gym: { category: "Healthcare", defaultSub: "Fitness & Gym", icon: "🏋️" },

  // Education
  education: { category: "Education", icon: "📚" },
  course: { category: "Education", defaultSub: "Online Course", icon: "🎓" },
  tuition: { category: "Education", defaultSub: "Coaching & Tuition", icon: "📖" },
  college: { category: "Education", defaultSub: "College Fees", icon: "🏫" },
  school: { category: "Education", defaultSub: "School Fees", icon: "🏫" },
  books: { category: "Education", defaultSub: "Books & Study Material", icon: "📚" },

  // Travel
  travel: { category: "Travel", icon: "✈️" },
  trip: { category: "Travel", defaultSub: "Vacation", icon: "🏖️" },
  hotel: { category: "Travel", defaultSub: "Accommodation", icon: "🏨" },
  airbnb: { category: "Travel", defaultSub: "Accommodation", icon: "🏡" },

  // Investments
  investments: { category: "Investments", icon: "📈" },
  investment: { category: "Investments", icon: "📈" },
  stocks: { category: "Investments", defaultSub: "Equity Market", icon: "📊" },
  share: { category: "Investments", defaultSub: "Equity Market", icon: "📊" },
  mutual_fund: { category: "Investments", defaultSub: "Mutual Funds", icon: "📈" },
  sip: { category: "Investments", defaultSub: "SIP Investment", icon: "📅" },
  gold: { category: "Investments", defaultSub: "Precious Metals", icon: "🪙" },
  crypto: { category: "Investments", defaultSub: "Crypto Assets", icon: "🪙" },

  // Income
  salary: { category: "Income", defaultSub: "Monthly Salary", icon: "💰" },
  stipend: { category: "Income", defaultSub: "Stipend", icon: "💰" },
  bonus: { category: "Income", defaultSub: "Performance Bonus", icon: "🎉" },
  freelance: { category: "Income", defaultSub: "Freelance Earnings", icon: "💻" },
  dividend: { category: "Income", defaultSub: "Dividend Payout", icon: "📈" },
  refund: { category: "Income", defaultSub: "Merchant Refund", icon: "↩️" },
  cashback: { category: "Income", defaultSub: "Reward Cashback", icon: "🎁" },
  interest: { category: "Income", defaultSub: "Savings Interest", icon: "🏦" },
};

/**
 * Parses numerical amount from natural language strings.
 * Supports: ₹500, 500 rupees, rs 1,200, 25k, 25 thousand, 1.5 lakh, 500.50, and Indic written/numeral figures
 */
export function extractAmount(text: string): number | null {
  const multiAmt = extractMultilingualAmount(text);
  if (multiAmt !== null) return multiAmt;

  const clean = text.toLowerCase().replace(/,/g, "");

  // Match K / Thousand (e.g., 25k, 25 thousand, 50k)
  const kMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand)\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Match Lakh / L (e.g., 1.5 lakh, 2 lakh, 1.2l)
  const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)\b/i);
  if (lakhMatch) {
    return Math.round(parseFloat(lakhMatch[1]) * 100000);
  }

  // Match Crore / Cr (e.g., 1 crore, 0.5 crore)
  const crMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b/i);
  if (crMatch) {
    return Math.round(parseFloat(crMatch[1]) * 10000000);
  }

  // Standard currency prefix or suffix
  // e.g. ₹500, rs 500, 500 rupees, 500 inr, or isolated number near monetary words
  const patterns = [
    /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?|bucks|inr)/i,
    /(?:spent|paid|add|received|got|earned|budget(?:ed)?\s+to|for|amount|goal)\s+(?:of\s+)?(\d+(?:\.\d+)?)/i,
    /\b(\d+(?:\.\d+)?)\b/, // Fallback to any standalone number
  ];

  for (const p of patterns) {
    const m = clean.match(p);
    if (m && m[1]) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && val > 0) {
        return Math.round(val * 100) / 100;
      }
    }
  }

  return null;
}

/**
 * Extracts date reference from natural language.
 * Supports: "yesterday", "today", "day before yesterday", "12 Sep", "2026-09-12", "12/09/2026", and Indic dates
 */
export function extractDate(text: string): string {
  const multiDate = extractMultilingualDate(text);
  if (multiDate) return multiDate;

  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("day before yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return d.toISOString().split("T")[0];
  }

  if (lower.includes("yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // Specific ISO date YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // Specific DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Textual date like "12 Sep" or "12 September"
  const textDateMatch = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/i
  );
  if (textDateMatch) {
    const day = parseInt(textDateMatch[1], 10);
    const monthName = textDateMatch[2].toLowerCase();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIndex = months.findIndex((m) => monthName.startsWith(m));
    const year = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : now.getFullYear();
    if (monthIndex !== -1) {
      const d = new Date(year, monthIndex, day);
      return d.toISOString().split("T")[0];
    }
  }

  // Default to today
  return now.toISOString().split("T")[0];
}

/**
 * Extracts category and subcategory from user utterance.
 */
export function extractCategory(text: string): {
  category: string;
  subcategory?: string;
  matchedKeyword?: string;
} {
  const multiCat = extractMultilingualCategory(text);
  if (multiCat.category && multiCat.category !== "Other") {
    return {
      category: multiCat.category,
      subcategory: multiCat.subcategory,
      matchedKeyword: multiCat.matchedKeyword,
    };
  }

  const lower = text.toLowerCase();
  const words = lower.replace(/[₹.,!?'"()]/g, " ").split(/\s+/).filter(Boolean);

  // Check multi-word keys first (e.g., "mutual fund", "credit card")
  for (const [key, mapping] of Object.entries(CATEGORY_MAP)) {
    if (key.includes("_") || key.includes(" ")) {
      const searchKey = key.replace(/_/g, " ");
      if (lower.includes(searchKey)) {
        return {
          category: mapping.category,
          subcategory: mapping.defaultSub,
          matchedKeyword: searchKey,
        };
      }
    }
  }

  // Single word keyword check
  for (const word of words) {
    if (CATEGORY_MAP[word]) {
      const mapping = CATEGORY_MAP[word];
      return {
        category: mapping.category,
        subcategory: mapping.defaultSub || (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : undefined),
        matchedKeyword: word,
      };
    }
  }

  // Fallback defaults
  if (lower.includes("salary") || lower.includes("earned") || lower.includes("received")) {
    return { category: "Income", subcategory: "Salary", matchedKeyword: "salary" };
  }

  return { category: "Other", matchedKeyword: undefined };
}

/**
 * Determines transaction type: income, expense, transfer, refund, or investment
 */
export function extractTransactionType(
  text: string,
  category: string
): "income" | "expense" | "transfer" | "refund" | "investment" {
  const multiType = extractMultilingualTxType(text, category);
  if (multiType === "income") return "income";

  const lower = text.toLowerCase();

  if (
    category === "Income" ||
    lower.includes("salary") ||
    lower.includes("received") ||
    lower.includes("got credited") ||
    lower.includes("earned") ||
    lower.includes("income") ||
    lower.includes("dividend") ||
    lower.includes("stipend") ||
    lower.includes("added to account")
  ) {
    return "income";
  }

  if (lower.includes("refund") || lower.includes("cashback")) {
    return "refund";
  }

  if (
    category === "Investments" ||
    lower.includes("invested") ||
    lower.includes("bought stocks") ||
    lower.includes("sip")
  ) {
    return "investment";
  }

  if (lower.includes("transferred") || lower.includes("sent to")) {
    return "transfer";
  }

  return "expense";
}

/**
 * Main intent parsing function.
 */
export function parseVoiceIntent(
  rawTranscript: string,
  options?: { isPendingAction?: boolean; activeLanguage?: string }
): ParsedVoiceIntent {
  const text = rawTranscript.trim();
  const lower = text.toLowerCase();

  const detected = detectLanguage(text);
  const langCode = options?.activeLanguage || detected.languageCode;
  const templates = getMultilingualResponseTemplate(langCode);

  // 0. Conversational Correction (if pending action or explicit correction marker)
  const correction = detectConversationalCorrection(text);
  if (
    correction.isCorrection ||
    (options?.isPendingAction && (correction.newAmount || (correction.newCategory && correction.newCategory !== "Other")))
  ) {
    const updatedAmt = correction.newAmount;
    const updatedCat = correction.newCategory;
    return {
      action: "correction",
      rawText: text,
      confidence: 0.96,
      amount: updatedAmt,
      category: updatedCat,
      detectedLanguage: detected,
      spokenPrompt: templates.correctionSuccess(
        updatedAmt ? `₹${updatedAmt.toLocaleString("en-IN")}` : "an amount",
        updatedCat || "transaction"
      ),
      explanation: "User requested a conversational correction to the pending action.",
    };
  }

  // 1. Hands-Free Voice Confirmation answers (Multilingual)
  const confirmPatterns = [
    /^(yes|yeah|yup|yep|sure|confirm|add it|save it|proceed|do it|ok|okay|correct|right|సరే|చేయి|జోడించు|అవును|సేవ్ చేయి|हाँ|हां|जोड़ो|ठीक है|करो|ஆம்|சரி|ಸರಿ|ശരി|ঠিক আছে|होय)$/i,
    /\b(yes please|yes confirm|please add|save transaction|ఖచ్చితంగా|జోడించు|जरूर|जोड़ दो)\b/i,
  ];
  for (const p of confirmPatterns) {
    if (p.test(lower)) {
      return {
        action: "confirm",
        rawText: text,
        confidence: 0.98,
        detectedLanguage: detected,
        explanation: "User confirmed the pending financial action.",
      };
    }
  }

  const cancelPatterns = [
    /^(no|nope|nah|cancel|stop|dont|don't|discard|abort|dismiss|వద్దు|రద్దు|ఆపు|చేయవద్దు|नहीं|रद्द करो|मत जोड़ो|रोको|வேண்டாம்|ಬೇಡ|വേണ്ട|না|नको)$/i,
    /\b(cancel it|don't add|do not add|never mind|రద్దు చేయి|रद्द करें)\b/i,
  ];
  for (const p of cancelPatterns) {
    if (p.test(lower)) {
      return {
        action: "cancel",
        rawText: text,
        confidence: 0.98,
        detectedLanguage: detected,
        spokenPrompt: templates.cancelled,
        explanation: "User cancelled the pending financial action.",
      };
    }
  }

  // 1b. Multilingual Financial Queries
  const queryCheck = extractMultilingualQuery(text);
  if (queryCheck.isQuery) {
    if (queryCheck.queryType === "balance") {
      return {
        action: "query_spending",
        rawText: text,
        confidence: 0.95,
        queryScope: "balance" as any,
        detectedLanguage: detected,
        explanation: "Query total account balance.",
      };
    }
    if (queryCheck.queryType === "budget_status") {
      return {
        action: "check_budget",
        rawText: text,
        confidence: 0.95,
        detectedLanguage: detected,
        explanation: "Check overall or category budget status.",
      };
    }
    if (queryCheck.queryType === "category_expense") {
      return {
        action: "query_spending",
        rawText: text,
        confidence: 0.95,
        queryScope: "category",
        category: queryCheck.category,
        detectedLanguage: detected,
        explanation: `Query spending on ${queryCheck.category}.`,
      };
    }
    if (queryCheck.queryType === "monthly_expense") {
      return {
        action: "query_spending",
        rawText: text,
        confidence: 0.95,
        queryScope: queryCheck.scope || "this_month",
        detectedLanguage: detected,
        explanation: "Query total monthly spending.",
      };
    }
  }

  // 2. Delete actions
  // e.g. "Delete the last transaction", "Remove that 500 food transaction"
  if (
    lower.includes("delete") ||
    lower.includes("remove") ||
    lower.includes("undo") ||
    lower.includes("cancel transaction")
  ) {
    if (lower.includes("last") || lower.includes("previous") || lower.includes("recent")) {
      return {
        action: "delete_last_transaction",
        rawText: text,
        confidence: 0.95,
        spokenPrompt: "Are you sure you want to delete the last recorded transaction?",
        explanation: "Delete the most recently added transaction.",
      };
    }

    // Specific transaction deletion
    const amount = extractAmount(lower);
    const catInfo = extractCategory(lower);
    return {
      action: "delete_specific_transaction",
      rawText: text,
      confidence: 0.9,
      deleteTarget: {
        amount: amount ?? undefined,
        category: catInfo.matchedKeyword ? catInfo.category : undefined,
        description: text,
      },
      spokenPrompt: `Found request to remove ${amount ? `₹${amount}` : ""} ${catInfo.category !== "Other" ? catInfo.category : ""} transaction. Confirm deletion?`,
      explanation: "Delete matching transaction by amount/category.",
    };
  }

  // 3. Goal creation
  // e.g. "Create a ₹50,000 laptop goal", "Set a 1 lakh emergency fund goal"
  if (
    lower.includes("goal") ||
    lower.includes("saving target") ||
    lower.includes("save for")
  ) {
    const amount = extractAmount(lower);
    // Extract goal name
    let goalName = "Savings Goal";
    const goalMatch = text.match(/(?:create|set|add)(?:\s+a)?\s+(?:₹?\d+[\d,kK\s]*(?:rupees?)?\s+)?(.+?)(?:\s+goal|\s+target)?$/i);
    if (goalMatch && goalMatch[1]) {
      const candidate = goalMatch[1]
        .replace(/\b(create|set|add|a|an|the|goal|target|rupees?)\b|₹|[\d,]+/gi, "")
        .trim();
      if (candidate.length > 2) {
        goalName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        if (!goalName.toLowerCase().includes("goal")) {
          goalName = `${goalName} Goal`;
        }
      }
    }

    return {
      action: "create_goal",
      rawText: text,
      confidence: 0.92,
      targetAmount: amount ?? 50000,
      goalName,
      spokenPrompt: `I understood: Create a ${amount ? `₹${amount.toLocaleString("en-IN")}` : ""} savings goal for "${goalName}". Should I create it?`,
      explanation: `Create savings goal "${goalName}" with target ₹${(amount ?? 50000).toLocaleString("en-IN")}.`,
    };
  }

  // 4. Budget updates
  // e.g. "Set food budget to ₹6,000", "Update shopping budget to 10000"
  if (
    (lower.includes("budget") && (lower.includes("set") || lower.includes("update") || lower.includes("change") || lower.includes("make"))) ||
    lower.includes("budget to")
  ) {
    const amount = extractAmount(lower);
    const catInfo = extractCategory(lower);
    const categoryName = catInfo.matchedKeyword ? catInfo.category : "Total Monthly";

    return {
      action: "update_budget",
      rawText: text,
      confidence: 0.94,
      category: categoryName,
      amount: amount ?? 5000,
      spokenPrompt: `I understood: Set ${categoryName} budget to ${amount ? `₹${amount.toLocaleString("en-IN")}` : ""}. Should I update it?`,
      explanation: `Update budget for ${categoryName} to ₹${(amount ?? 5000).toLocaleString("en-IN")}.`,
    };
  }

  // 5. Checking budget
  // e.g. "How much budget is left?", "How much money do I have left for shopping?"
  if (
    (lower.includes("how much") && (lower.includes("left") || lower.includes("remaining"))) ||
    lower.includes("budget left") ||
    lower.includes("check budget")
  ) {
    const catInfo = extractCategory(lower);
    return {
      action: "check_budget",
      rawText: text,
      confidence: 0.92,
      category: catInfo.matchedKeyword ? catInfo.category : undefined,
      explanation: "Inspect remaining budget limit and adherence.",
    };
  }

  // 6. Query spending
  // e.g. "How much did I spend today?", "What did I spend on food this month?", "Show spending"
  if (
    (lower.includes("how much") && (lower.includes("spend") || lower.includes("spent"))) ||
    (lower.includes("what did i spend") || lower.includes("total expense"))
  ) {
    let scope: "today" | "yesterday" | "this_month" | "last_month" | "general" = "this_month";
    if (lower.includes("today")) scope = "today";
    else if (lower.includes("yesterday")) scope = "yesterday";
    else if (lower.includes("last month")) scope = "last_month";
    else if (lower.includes("month")) scope = "this_month";

    const catInfo = extractCategory(lower);
    return {
      action: "query_spending",
      rawText: text,
      confidence: 0.95,
      queryScope: scope,
      category: catInfo.matchedKeyword ? catInfo.category : undefined,
      explanation: `Query spending for ${scope} ${catInfo.matchedKeyword ? `in ${catInfo.category}` : ""}.`,
    };
  }

  // 7. Document Vault Voice Commands & Search
  // 7a. Document Expiry Query
  // e.g. "When does my driving licence expire?", "What is the expiry date of my passport?", "When will my insurance expire?"
  if (
    (lower.includes("when does") || lower.includes("when will") || lower.includes("what is the expiry") || lower.includes("expiry date") || lower.includes("expiry of") || lower.includes("when is the expiry")) &&
    (lower.includes("expire") || lower.includes("expiry") || lower.includes("valid upto"))
  ) {
    let query = text
      .replace(/when\s+(?:does|will|is)|what\s+is\s+the|expiry\s+(?:date\s+of|date|of)?|expire(?:s)?|valid\s+upto|my|the|document|please|\?/gi, "")
      .trim();
    if (!query) query = "driving licence";
    return {
      action: "query_document_expiry",
      rawText: text,
      confidence: 0.96,
      documentQuery: query,
      spokenPrompt: `Checking expiry date for ${query}...`,
      explanation: `Query expiration date for ${query}.`,
    };
  }

  // 7b. Smart Bundle Creation
  // e.g. "Create job application bundle", "Generate travel packet bundle", "Export tax bundle"
  if (
    (lower.includes("bundle") || lower.includes("packet") || lower.includes("dossier")) &&
    (lower.includes("create") || lower.includes("generate") || lower.includes("export") || lower.includes("build") || lower.includes("make") || lower.includes("open"))
  ) {
    let bundleType: "job" | "travel" | "tax" | "custom" = "custom";
    if (lower.includes("job") || lower.includes("career") || lower.includes("employment")) {
      bundleType = "job";
    } else if (lower.includes("travel") || lower.includes("visa") || lower.includes("flight")) {
      bundleType = "travel";
    } else if (lower.includes("tax") || lower.includes("kyc") || lower.includes("itr") || lower.includes("bank")) {
      bundleType = "tax";
    }

    return {
      action: "create_document_bundle",
      rawText: text,
      confidence: 0.96,
      bundleType,
      spokenPrompt: `Preparing ${bundleType.toUpperCase()} document bundle...`,
      explanation: `Create and bundle documents for ${bundleType}.`,
    };
  }

  // 7c. Lock vault
  // e.g. "Lock my vault", "Find my Aadhaar document", "Show expiring documents", "Find my driving licence"
  if (lower.includes("lock") && (lower.includes("vault") || lower.includes("document"))) {
    return {
      action: "find_document",
      rawText: text,
      confidence: 0.98,
      documentQuery: "lock_vault",
      spokenPrompt: "Locking document vault security PIN shield.",
      explanation: "Lock document vault with 4-digit security PIN.",
    };
  }

  if (
    lower.includes("document") ||
    lower.includes("certificate") ||
    lower.includes("vault") ||
    lower.includes("find my") ||
    lower.includes("expiring") ||
    ((lower.startsWith("show my") || lower.startsWith("find") || lower.startsWith("get my") || lower.startsWith("open")) &&
      (lower.includes("aadhaar") ||
       lower.includes("aadhar") ||
       lower.includes("pan") ||
       lower.includes("passport") ||
       lower.includes("licence") ||
       lower.includes("license") ||
       lower.includes("marksheet") ||
       lower.includes("degree") ||
       lower.includes("policy") ||
       lower.includes("resume")))
  ) {
    let docCategory: string | undefined = undefined;
    if (lower.includes("education") || lower.includes("degree") || lower.includes("marksheet")) {
      docCategory = "Education";
    } else if (lower.includes("identity") || lower.includes("aadhaar") || lower.includes("aadhar") || lower.includes("pan") || lower.includes("licence") || lower.includes("license")) {
      docCategory = "Identity";
    } else if (lower.includes("insurance") || lower.includes("policy")) {
      docCategory = "Insurance";
    } else if (lower.includes("travel") || lower.includes("passport")) {
      docCategory = "Travel";
    } else if (lower.includes("medical") || lower.includes("prescription") || lower.includes("health")) {
      docCategory = "Medical";
    } else if (lower.includes("employment") || lower.includes("resume") || lower.includes("cv")) {
      docCategory = "Employment";
    }

    let query = text
      .replace(/find\s+my|show\s+my|get\s+my|search|locate|open|document(?:s)?|certificate(?:s)?|please/gi, "")
      .trim();
    if (lower.includes("expiring") || lower.includes("expiry")) {
      query = "expiring";
    } else if (!query) {
      query = docCategory || "documents";
    }

    return {
      action: "find_document",
      rawText: text,
      confidence: 0.95,
      documentQuery: query,
      documentCategory: docCategory,
      spokenPrompt: query === "expiring" ? "Checking documents expiring soon..." : `Searching document vault for "${query}"...`,
      explanation: `Search document vault for ${query} (${docCategory || "All categories"}).`,
    };
  }


  // 8. Filter transactions
  // e.g. "Show my food expenses", "Show transactions from yesterday"
  if (
    lower.startsWith("show") ||
    lower.startsWith("filter") ||
    lower.startsWith("list") ||
    lower.includes("display transactions")
  ) {
    const catInfo = extractCategory(lower);
    const date = lower.includes("yesterday") || lower.includes("today") ? extractDate(lower) : undefined;
    return {
      action: "filter_transactions",
      rawText: text,
      confidence: 0.9,
      category: catInfo.matchedKeyword ? catInfo.category : undefined,
      targetDate: date,
      explanation: "Filter transactions list by specified criteria.",
    };
  }

  // 9. Add Transaction (Default action for financial recordings)
  // e.g.:
  // "Add ₹500 food"
  // "Spent ₹800 on groceries yesterday"
  // "I spent 350 rupees on lunch"
  // "I paid 1,200 for electricity"
  // "Add 500 for Uber"
  // "Received ₹25,000 salary"
  // "Add 2,000 rupees salary"
  const amount = extractAmount(lower);
  const catInfo = extractCategory(lower);
  const txType = extractTransactionType(lower, catInfo.category);
  const date = extractDate(lower);

  // Generate a clean description
  let description = "";
  if (catInfo.subcategory) {
    description = catInfo.subcategory;
  } else if (catInfo.matchedKeyword) {
    description = catInfo.matchedKeyword.charAt(0).toUpperCase() + catInfo.matchedKeyword.slice(1);
  } else {
    description = txType === "income" ? "Income Deposit" : "Expense";
  }

  // If user mentioned merchant like "Uber", "Swiggy", "Zomato", make sure it's capitalized
  const merchantKeys = ["uber", "ola", "zomato", "swiggy", "amazon", "flipkart", "blinkit", "zepto", "starbucks"];
  for (const m of merchantKeys) {
    if (lower.includes(m)) {
      description = m.charAt(0).toUpperCase() + m.slice(1);
      break;
    }
  }

  const confidence = amount ? 0.95 : 0.6;
  const formattedAmt = amount ? `₹${amount.toLocaleString("en-IN")}` : "an amount";
  const actionLabel = txType === "income" ? "income" : "expense";
  const spokenPrompt = templates.confirmPrompt(
    formattedAmt,
    actionLabel,
    catInfo.category,
    catInfo.subcategory
  );

  return {
    action: "add_transaction",
    rawText: text,
    confidence,
    detectedLanguage: detected,
    type: txType,
    amount: amount ?? undefined,
    category: catInfo.category,
    subcategory: catInfo.subcategory,
    date,
    description,
    paymentMethod: lower.includes("cash") ? "cash" : lower.includes("card") ? "credit_card" : "upi",
    spokenPrompt,
    explanation: `Record ${actionLabel} of ${formattedAmt} in ${catInfo.category}.`,
  };
}
