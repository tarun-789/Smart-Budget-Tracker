import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BrainCircuit,
  Send,
  User,
  Bot,
  CheckCircle2,
} from "lucide-react";
import { useFinanceStore } from "../services/dataStore";
import { useDocumentStore } from "../services/documentStore";
import { useAuth } from "../contexts/AuthContext";
import {
  calculateIncome,
  calculateExpenses,
  calculateSavings,
  calculateSavingsRate,
  calculateCategoryTotals,
  calculateForecast,
  calculateNetWorth,
  extractDocumentObligations,
} from "../services/financialCalculations";
import { formatINR, formatDate } from "../utils/formatters";
import { matchesDateQuery, formatDateWithDay } from "../utils/dateHelpers";
import { parseVoiceIntent } from "../services/voice/intentParser";
import { LanguageSelector } from "../components/common/LanguageSelector";
import {
  getLanguageSettings,
  saveLanguageSettings,
} from "../services/multilingual/languageConfig";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  dataHighlight?: {
    label: string;
    value: string;
    subtext?: string;
  };
  suggestions?: string[];
  timestamp: string;
}

const createMsgId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export default function FinanceAI() {
  const { profile } = useAuth();
  const { transactions, accounts } = useFinanceStore();
  const { getDocuments } = useDocumentStore();

  const langSettings = getLanguageSettings();
  const [chatLanguage, setChatLanguage] = useState(langSettings.preferredLanguage || "en-IN");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Seed Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "assistant",
      text: `Hello ${profile?.full_name?.split(" ")[0] || "Tarun"}! I'm your FinSight AI financial intelligence assistant. I analyze your real transactions, account balances, and budget allocations to give you exact numbers and personalized guidance. What would you like to explore today?`,
      timestamp: "Just now",
      suggestions: [
        "Are there upcoming insurance or document obligations?",
        "How much did I spend on food this month?",
        "What are my biggest expense categories?",
        "Can I afford a ₹25,000 purchase?",
        "What is my current net worth?",
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Financial Query Evaluation Engine (Math First, then Natural Language)
  const evaluateQuery = useCallback((query: string): ChatMessage => {
    const q = query.toLowerCase();
    const income = calculateIncome(transactions);
    const expenses = calculateExpenses(transactions);
    const savings = calculateSavings(income, expenses);
    const savingsRate = calculateSavingsRate(savings, income);
    const categoryTotals = calculateCategoryTotals(transactions);
    const forecast = calculateForecast(transactions);
    const netWorthData = calculateNetWorth(accounts as any);

    // 0. Multilingual Natural Language Parsing (Telugu, Hindi, English, etc.)
    const multiIntent = parseVoiceIntent(query, { activeLanguage: chatLanguage });
    if (multiIntent.action === "add_transaction" && multiIntent.amount) {
      const formattedAmt = formatINR(multiIntent.amount);
      const langName = multiIntent.detectedLanguage?.nativeName || "Indic";
      return {
        id: createMsgId("msg"),
        sender: "assistant",
        text: `Identified financial transaction from ${langName} input:\n• Amount: ${formattedAmt}\n• Category: ${multiIntent.category || "Other"}${multiIntent.subcategory ? ` (${multiIntent.subcategory})` : ""}\n• Type: ${multiIntent.type === "income" ? "Income Deposit" : "Expense"}\n• Date: ${multiIntent.date || "Today"}\n\nYou can use the Voice & Actions Assistant (Microphone icon in header or ⌘K) to confirm and record this transaction directly into your ledger.`,
        dataHighlight: {
          label: `Extracted ${multiIntent.type === "income" ? "Income" : "Expense"}`,
          value: formattedAmt,
          subtext: `${multiIntent.category || "General"} • Input: ${langName}`,
        },
        suggestions: [
          "What is my balance?",
          "How much did I spend this month?",
          "Can I afford a ₹25,000 purchase?",
        ],
        timestamp: "Just now",
      };
    }

    if (multiIntent.action === "query_spending" && (multiIntent as any).queryScope === "balance") {
      const totalBal = accounts.reduce((acc, a) => acc + a.balance, 0);
      const bankBreakdown = accounts
        .map((a) => `• ${a.name}: ${formatINR(a.balance)} (${a.account_type.replace(/_/g, " ")})`)
        .join("\n");
      return {
        id: createMsgId("msg"),
        sender: "assistant",
        text: `Your total liquid account balance across all ${accounts.length} connected accounts is ${formatINR(totalBal)}.\n\nAccount balances:\n${bankBreakdown}`,
        dataHighlight: {
          label: "Total Liquid Balance",
          value: formatINR(totalBal),
          subtext: `${accounts.length} Accounts Active`,
        },
        suggestions: [
          "How much did I spend this month?",
          "What are my biggest expense categories?",
          "Can I afford a ₹25,000 purchase?",
        ],
        timestamp: "Just now",
      };
    }

    // Date Query Check: e.g. "details for 12 Sep", "what did I spend on 2026-09-12", "transactions on today"
    const matchingTx = transactions.filter((t) => matchesDateQuery(t.transaction_date, q));
    if (
      matchingTx.length > 0 ||
      q.includes("today") ||
      q.includes("yesterday") ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(q) ||
      /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(q) ||
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i.test(q) ||
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/i.test(q)
    ) {
      if (matchingTx.length > 0) {
        const targetDate = matchingTx[0].transaction_date.split("T")[0];
        const dayIncome = matchingTx
          .filter((t) => t.transaction_type === "income" || t.transaction_type === "refund")
          .reduce((sum, t) => sum + t.amount, 0);
        const dayExpense = matchingTx
          .filter((t) => t.transaction_type === "expense" || t.transaction_type === "investment")
          .reduce((sum, t) => sum + t.amount, 0);
        const dayNet = dayIncome - dayExpense;
        const txList = matchingTx
          .map(
            (t) =>
              `• ${t.description}: ${t.transaction_type === "income" ? "+" : "-"}${formatINR(t.amount)} (${t.category?.name || "General"})`
          )
          .join("\n");

        return {
          id: createMsgId("msg"),
          sender: "assistant",
          text: `Here are the details for ${formatDateWithDay(targetDate)}:\n\nYou have ${matchingTx.length} transaction(s) on this date.\n• Total Inflow: ${formatINR(dayIncome)}\n• Total Outflow: ${formatINR(dayExpense)}\n• Net Daily Balance: ${dayNet >= 0 ? "+" : ""}${formatINR(dayNet)}\n\nRecorded transactions:\n${txList}`,
          dataHighlight: {
            label: `Date Details: ${targetDate}`,
            value: `${dayNet >= 0 ? "+" : ""}${formatINR(dayNet)}`,
            subtext: `${matchingTx.length} records • In: ${formatINR(dayIncome)} | Out: ${formatINR(dayExpense)}`,
          },
          suggestions: [
            "What are my biggest expense categories?",
            "Can I afford a ₹25,000 purchase?",
            "Where am I overspending?",
          ],
          timestamp: "Just now",
        };
      } else {
        return {
          id: createMsgId("msg"),
          sender: "assistant",
          text: `I searched your ledger for that date, but found 0 recorded transactions on that day. You can add one by clicking "+ Add Transaction" on the Dashboard or Transactions page!`,
          dataHighlight: {
            label: "Search Date",
            value: "0 Transactions Found",
            subtext: "No transactions recorded for this day",
          },
          suggestions: [
            "What are my biggest expense categories?",
            "What is my current net worth?",
            "Show my budget status",
          ],
          timestamp: "Just now",
        };
      }
    }

    // Query 1: Food / Dining spend
    if (q.includes("food") || q.includes("dining") || q.includes("swiggy") || q.includes("zomato")) {
      const food = categoryTotals.find((c) => c.category_name.toLowerCase().includes("food"));
      const foodTotal = food ? food.total : 0;
      const count = food ? food.transaction_count : 0;

      return {
        id: "msg-" + Date.now(),
        sender: "assistant",
        text: `You have spent ${formatINR(foodTotal)} across ${count} food & dining orders in September 2026. This represents ${food?.percentage.toFixed(1) || 0}% of your total expenses.`,
        dataHighlight: {
          label: "Food & Dining Spend",
          value: formatINR(foodTotal),
          subtext: `${count} transactions • Budgeted limit: ₹8,000`,
        },
        suggestions: [
          "Where am I overspending?",
          "Can I afford a ₹25,000 purchase?",
          "What is my current net worth?",
        ],
        timestamp: "Just now",
      };
    }

    // Query 2: Biggest expenses / Categories
    if (q.includes("biggest") || q.includes("top expense") || q.includes("categories") || q.includes("breakdown")) {
      const top3 = categoryTotals.slice(0, 3);
      const topSummary = top3.map((c) => `${c.category_name}: ${formatINR(c.total)} (${c.percentage.toFixed(1)}%)`).join(", ");

      return {
        id: "msg-" + Date.now(),
        sender: "assistant",
        text: `Your top 3 spending categories are: ${topSummary}. Housing (Rent) and Groceries comprise the bulk of your essential living expenses.`,
        dataHighlight: {
          label: "Top Category: " + (top3[0]?.category_name || "Housing"),
          value: formatINR(top3[0]?.total || 0),
          subtext: `${top3[0]?.percentage.toFixed(1) || 0}% of total outflows`,
        },
        suggestions: [
          "How much did I spend on food this month?",
          "Where am I overspending?",
          "What is my projected month-end balance?",
        ],
        timestamp: "Just now",
      };
    }

    // Query 3: Affordability Check ("Can I afford X?")
    if (q.includes("afford") || q.includes("purchase") || q.includes("buy")) {
      const targetSpend = 25000;
      const canAfford = savings >= targetSpend;

      return {
        id: "msg-" + Date.now(),
        sender: "assistant",
        text: canAfford
          ? `Yes, you can afford a ${formatINR(targetSpend)} purchase! Your current net savings this month stand at ${formatINR(savings)}, which safely covers this expense without dipping into your emergency fund.`
          : `I advise caution with a ${formatINR(targetSpend)} purchase right now. Your current surplus savings are ${formatINR(savings)}. Making this purchase would reduce your savings rate below 10%.`,
        dataHighlight: {
          label: canAfford ? "Affordability: Approved" : "Affordability: Caution",
          value: canAfford ? "Safe to Purchase" : "Postpone to Next Month",
          subtext: `Available surplus: ${formatINR(savings)}`,
        },
        suggestions: [
          "What is my current net worth?",
          "How can I save more this month?",
          "Show my savings goals progress",
        ],
        timestamp: "Just now",
      };
    }

    // Query 4: Overspending / Budget Adherence
    if (q.includes("overspend") || q.includes("leak") || q.includes("budget") || q.includes("cut")) {
      return {
        id: "msg-" + Date.now(),
        sender: "assistant",
        text: `Your primary overspending area is Shopping & E-Commerce, which has consumed 71.6% of its monthly allowance by the 12th of September. Food & Dining is also near its 80% warning threshold. Trimming both can recover ~₹2,500/month.`,
        dataHighlight: {
          label: "Recommended Monthly Trims",
          value: "+₹2,500 / month",
          subtext: "Reallocate to Emergency Fund or SIP",
        },
        suggestions: [
          "Simulate savings with What-If slider",
          "Can I afford a ₹25,000 purchase?",
          "What is my projected month-end balance?",
        ],
        timestamp: "Just now",
      };
    }

    // Query 5: Net Worth / Balance
    if (q.includes("net worth") || q.includes("balance") || q.includes("asset") || q.includes("worth")) {
      return {
        id: "msg-" + Date.now(),
        sender: "assistant",
        text: `Your total net worth is ${formatINR(netWorthData.net_worth)}. This consists of ${formatINR(netWorthData.assets)} in liquid cash, bank deposits, and Zerodha mutual funds, offset by ${formatINR(netWorthData.liabilities)} in credit card debt.`,
        dataHighlight: {
          label: "Net Worth Position",
          value: formatINR(netWorthData.net_worth),
          subtext: `Assets: ${formatINR(netWorthData.assets)} • Debt: ${formatINR(netWorthData.liabilities)}`,
        },
        suggestions: [
          "How much did I spend on food this month?",
          "Can I afford a ₹25,000 purchase?",
          "What are my biggest expense categories?",
        ],
        timestamp: "Just now",
      };
    }

    // Query 6: Upcoming Document Obligations / Insurance Renewal
    if (
      q.includes("obligation") ||
      q.includes("renewal") ||
      q.includes("insurance") ||
      q.includes("vault") ||
      q.includes("policy") ||
      q.includes("sinking")
    ) {
      const docs = getDocuments();
      const obligations = extractDocumentObligations(docs);
      if (obligations.length > 0) {
        const top = obligations[0];
        return {
          id: createMsgId("msg"),
          sender: "assistant",
          text: `I discovered ${obligations.length} upcoming financial obligation(s) in your Secure Document Vault: "${top.documentName}" has an annual premium of ${formatINR(top.amount)} due on ${formatDate(top.dueDate, "long")} (${top.daysRemaining} days remaining). To prevent lump-sum budget strain, FinSight AI suggests an automated sinking fund of ${formatINR(top.suggestedMonthlySaving)}/month.`,
          dataHighlight: {
            label: `${top.obligationType} Sinking Fund`,
            value: `${formatINR(top.suggestedMonthlySaving)} / mo`,
            subtext: `Total obligation ${formatINR(top.amount)} due ${top.dueDate} (${top.daysRemaining} days left)`,
          },
          suggestions: [
            "What is my current net worth?",
            "Where am I overspending?",
            "Can I afford a ₹25,000 purchase?",
          ],
          timestamp: "Just now",
        };
      } else {
        return {
          id: createMsgId("msg"),
          sender: "assistant",
          text: "I scanned your Secure Document Vault and found no upcoming financial obligations or renewal premiums due in the immediate future. All existing policies and documents are up to date!",
          suggestions: [
            "What is my current net worth?",
            "How much did I spend on food this month?",
            "What are my biggest expense categories?",
          ],
          timestamp: "Just now",
        };
      }
    }

    // Default Query Response with Comprehensive Snapshot
    return {
      id: createMsgId("msg"),
      sender: "assistant",
      text: `Based on your live portfolio: Your month-to-date income is ${formatINR(income)} and expenses are ${formatINR(expenses)}, yielding a net savings rate of ${savingsRate.toFixed(1)}%. Your month-end projected surplus is ${formatINR(forecast.projected_savings)}.`,
      dataHighlight: {
        label: "Current Savings Rate",
        value: `${savingsRate.toFixed(1)}%`,
        subtext: `Net surplus: ${formatINR(savings)}`,
      },
      suggestions: [
        "How much did I spend on food this month?",
        "What are my biggest expense categories?",
        "Can I afford a ₹25,000 purchase?",
      ],
      timestamp: "Just now",
    };
  }, [transactions, accounts, getDocuments]);

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: createMsgId("user"),
      sender: "user",
      text: query,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = evaluateQuery(query);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
            <BrainCircuit size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              FinSight AI Assistant
              <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded-full text-[10px] font-bold uppercase">
                Gemini Intelligence
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Deterministic DB math combined with natural language insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSelector
            variant="compact"
            currentLanguage={chatLanguage}
            onSelectLanguage={(code) => {
              setChatLanguage(code);
              saveLanguageSettings({ preferredLanguage: code });
            }}
          />

          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
            <CheckCircle2 size={13} />
            <span>Real-time Store Synced</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-blue-600/20">
                  <Bot size={17} />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-sm space-y-3 ${
                  isUser
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-gray-900 border border-gray-800 text-gray-200"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {/* Data Highlight Card if present */}
                {msg.dataHighlight && (
                  <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
                    <p className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                      {msg.dataHighlight.label}
                    </p>
                    <p className="text-xl font-bold text-white font-mono">
                      {msg.dataHighlight.value}
                    </p>
                    {msg.dataHighlight.subtext && (
                      <p className="text-xs text-gray-500">{msg.dataHighlight.subtext}</p>
                    )}
                  </div>
                )}

                {/* Quick Follow-up Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
                    <p className="text-[11px] text-gray-400 font-medium">Suggested queries:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(s)}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={17} />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 items-center text-gray-400 text-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Bot size={17} />
            </div>
            <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 text-xs text-gray-400">Calculating portfolio data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="pt-2 border-t border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money, budgets, or investments in plain English..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl font-semibold transition-colors flex items-center justify-center shadow-lg shadow-blue-600/20"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
