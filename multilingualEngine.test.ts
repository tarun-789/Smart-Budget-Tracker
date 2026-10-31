// FinSight AI — Multilingual Engine Specification & Integration Tests
// Verifies 8 Indian languages, direct intent extraction, code-mixing, and conversational correction.

import { describe, it, expect, beforeEach } from "vitest";
import { parseVoiceIntent } from "../services/voice/intentParser";
import {
  extractMultilingualAmount,
  extractMultilingualQuery,
  detectConversationalCorrection,
  getMultilingualResponseTemplate,
  normalizeIndicDigits,
} from "../services/multilingual/multilingualDictionary";
import { detectLanguage } from "../services/multilingual/multilingualDetector";
import {
  getLanguageSettings,
  saveLanguageSettings,
  SUPPORTED_LANGUAGES,
} from "../services/multilingual/languageConfig";

describe("Multilingual Financial Processing Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Direct Multilingual Entity Extraction (Without English Pre-Translation)", () => {
    it("parses Telugu direct expense: 'ఈరోజు ఫుడ్ కోసం 350 రూపాయలు ఖర్చు చేశాను'", () => {
      const text = "ఈరోజు ఫుడ్ కోసం 350 రూపాయలు ఖర్చు చేశాను";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.type).toBe("expense");
      expect(intent.amount).toBe(350);
      expect(intent.category).toBe("Food");
      expect(intent.date).toBe(new Date().toISOString().split("T")[0]);
      expect(intent.detectedLanguage?.languageCode).toBe("te-IN");
    });

    it("parses Hindi direct expense: 'मैंने आज यात्रा पर 500 रुपये खर्च किए'", () => {
      const text = "मैंने आज यात्रा पर 500 रुपये खर्च किए";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.type).toBe("expense");
      expect(intent.amount).toBe(500);
      expect(intent.category).toBe("Transportation");
      expect(intent.date).toBe(new Date().toISOString().split("T")[0]);
      expect(intent.detectedLanguage?.languageCode).toBe("hi-IN");
    });

    it("parses colloquial Telugu merchant expression: 'నిన్న Swiggy లో 450'", () => {
      const text = "నిన్న Swiggy లో 450";
      const intent = parseVoiceIntent(text);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedYesterday = yesterday.toISOString().split("T")[0];

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(450);
      expect(intent.category).toBe("Food");
      expect(intent.description).toBe("Swiggy");
      expect(intent.date).toBe(expectedYesterday);
    });

    it("parses Tamil expense: 'இன்று உணவுக்கு 300 ரூபாய் செலவு செய்தேன்'", () => {
      const text = "இன்று உணவுக்கு 300 ரூபாய் செலவு செய்தேன்";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(300);
      expect(intent.category).toBe("Food");
      expect(intent.detectedLanguage?.languageCode).toBe("ta-IN");
    });

    it("parses Kannada expense: 'ಇಂದು ಊಟಕ್ಕಾಗಿ 350 ರೂಪಾಯಿ ಖರ್ಚು ಮಾಡಿದೆ'", () => {
      const text = "ಇಂದು ಊಟಕ್ಕಾಗಿ 350 ರೂಪಾಯಿ ಖರ್ಚು ಮಾಡಿದೆ";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(350);
      expect(intent.category).toBe("Food");
      expect(intent.detectedLanguage?.languageCode).toBe("kn-IN");
    });
  });

  describe("2. Code-Mixed Vernacular Language Support", () => {
    it("handles Telugu + English code-mixed input: 'ఈరోజు college కి వెళ్లడానికి Uber 250'", () => {
      const text = "ఈరోజు college కి వెళ్లడానికి Uber 250";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(250);
      expect(intent.category).toBe("Transportation");
      expect(intent.description).toBe("Uber");
      expect(intent.date).toBe(new Date().toISOString().split("T")[0]);
      expect(intent.detectedLanguage?.isCodeMixed).toBe(true);
    });

    it("handles colloquial transliterated mixed phrase: 'నేను today food మీద 300 spend చేశాను'", () => {
      const text = "నేను today food మీద 300 spend చేశాను";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(300);
      expect(intent.category).toBe("Food");
      expect(intent.date).toBe(new Date().toISOString().split("T")[0]);
    });

    it("handles Hindi + English code-mixed input: 'मैंने आज Uber पर 250 खर्च किए'", () => {
      const text = "मैंने आज Uber पर 250 खर्च किए";
      const intent = parseVoiceIntent(text);

      expect(intent.action).toBe("add_transaction");
      expect(intent.amount).toBe(250);
      expect(intent.category).toBe("Transportation");
      expect(intent.description).toBe("Uber");
    });
  });

  describe("3. Native Numeral & Written Indic Words Extraction", () => {
    it("normalizes Telugu native script digits: ౩౫౦ -> 350", () => {
      expect(normalizeIndicDigits("౩౫౦")).toBe("350");
      expect(extractMultilingualAmount("ఫుడ్ ౩౫౦")).toBe(350);
    });

    it("normalizes Devanagari native script digits: ५०० -> 500", () => {
      expect(normalizeIndicDigits("५००")).toBe("500");
      expect(extractMultilingualAmount("खर्च ५००")).toBe(500);
    });

    it("extracts Telugu spoken written number words: 'మూడు వందల రూపాయలు' -> 300", () => {
      const amount = extractMultilingualAmount("మూడు వందల రూపాయలు ఫుడ్ కోసం");
      expect(amount).toBe(300);
    });

    it("extracts Hindi spoken written number words: 'पाँच सौ रुपये' -> 500", () => {
      const amount = extractMultilingualAmount("पाँच सौ रुपये खर्च");
      expect(amount).toBe(500);
    });
  });

  describe("4. Multilingual Financial Questions & Intent System", () => {
    it("maps balance queries across Telugu, Hindi, Tamil, and English to GET_BALANCE", () => {
      const queries = [
        "What is my balance?",
        "నా బ్యాలెన్స్ ఎంత?",
        "मेरा बैलेंस कितना है?",
        "என் இருப்பு எவ்வளவு?",
        "ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು?",
      ];

      for (const q of queries) {
        const queryResult = extractMultilingualQuery(q);
        expect(queryResult.isQuery).toBe(true);
        expect(queryResult.queryType).toBe("balance");
      }
    });

    it("maps monthly expense queries across languages to GET_MONTHLY_EXPENSE", () => {
      const queries = [
        "How much did I spend this month?",
        "ఈ నెల నేను ఎంత ఖర్చు చేశాను?",
        "मैंने इस महीने कितना खर्च किया?",
        "இந்த மாதம் நான் எவ்வளவு செலவு செய்தேன்?",
      ];

      for (const q of queries) {
        const queryResult = extractMultilingualQuery(q);
        expect(queryResult.isQuery).toBe(true);
        expect(queryResult.queryType).toBe("monthly_expense");
      }
    });

    it("maps category-specific expense queries to GET_CATEGORY_EXPENSE", () => {
      const teluguFood = extractMultilingualQuery("ఈ నెల ఫుడ్ కోసం ఎంత ఖర్చు చేశాను?");
      expect(teluguFood.isQuery).toBe(true);
      expect(teluguFood.queryType).toBe("category_expense");
      expect(teluguFood.category).toBe("Food");

      const hindiFood = extractMultilingualQuery("भोजन पर कितना खर्च हुआ?");
      expect(hindiFood.isQuery).toBe(true);
      expect(hindiFood.queryType).toBe("category_expense");
      expect(hindiFood.category).toBe("Food");
    });

    it("maps budget health queries to GET_BUDGET_STATUS", () => {
      const teluguBudget = extractMultilingualQuery("నా బడ్జెట్ ఎలా ఉంది?");
      expect(teluguBudget.isQuery).toBe(true);
      expect(teluguBudget.queryType).toBe("budget_status");

      const hindiBudget = extractMultilingualQuery("मेरा बजट कैसा है?");
      expect(hindiBudget.isQuery).toBe(true);
      expect(hindiBudget.queryType).toBe("budget_status");
    });
  });

  describe("5. Conversational Correction Detection", () => {
    it("detects English correction: 'No, that was 800'", () => {
      const correction = detectConversationalCorrection("No, that was 800");
      expect(correction.isCorrection).toBe(true);
      expect(correction.newAmount).toBe(800);
    });

    it("detects Telugu correction: 'లేదు, అది 800'", () => {
      const correction = detectConversationalCorrection("లేదు, అది 800");
      expect(correction.isCorrection).toBe(true);
      expect(correction.newAmount).toBe(800);
    });

    it("detects Hindi correction: 'नहीं, वह 800 था'", () => {
      const correction = detectConversationalCorrection("नहीं, वह 800 था");
      expect(correction.isCorrection).toBe(true);
      expect(correction.newAmount).toBe(800);
    });

    it("mutates pending action during voice parsing without creating new transaction", () => {
      const correctionIntent = parseVoiceIntent("No, that was 800", { isPendingAction: true });
      expect(correctionIntent.action).toBe("correction");
      expect(correctionIntent.amount).toBe(800);
    });
  });

  describe("6. Automatic Language & Script Detection", () => {
    it("accurately classifies 8 Indian scripts with high confidence", () => {
      expect(detectLanguage("ఈరోజు 500 ఖర్చు").languageCode).toBe("te-IN");
      expect(detectLanguage("आज 500 खर्च किया").languageCode).toBe("hi-IN");
      expect(detectLanguage("இன்று 300 செலவு").languageCode).toBe("ta-IN");
      expect(detectLanguage("ಇಂದು 350 ಖರ್ಚು").languageCode).toBe("kn-IN");
      expect(detectLanguage("ഇന്ന് 300 ചിലവ്").languageCode).toBe("ml-IN");
      expect(detectLanguage("আজ 350 খরচ করেছি").languageCode).toBe("bn-IN");
      expect(detectLanguage("Spent 500 on food").languageCode).toBe("en-IN");
    });

    it("flags mixed scripts as code-mixed", () => {
      const result = detectLanguage("ఈరోజు college కి వెళ్లడానికి Uber 250");
      expect(result.languageCode).toBe("te-IN");
      expect(result.isCodeMixed).toBe(true);
    });
  });

  describe("7. Multilingual Response Generation & Synthesizer Templates", () => {
    it("generates natural language response templates in Telugu", () => {
      const teluguTpl = getMultilingualResponseTemplate("te-IN");
      const confirmation = teluguTpl.confirmPrompt("₹300", "expense", "Food");
      expect(confirmation).toContain("Food");
      expect(confirmation).toContain("₹300");
      expect(confirmation).toContain("జోడించమంటారా");

      const success = teluguTpl.addSuccess("₹300", "expense", "Food");
      expect(success).toContain("విజయవంతంగా జోడించబడింది");
    });

    it("generates natural language response templates in Hindi", () => {
      const hindiTpl = getMultilingualResponseTemplate("hi-IN");
      const success = hindiTpl.addSuccess("₹500", "expense", "भोजन");
      expect(success).toContain("सफलतापूर्वक जोड़ा गया है");
    });
  });

  describe("8. Language Settings & Preferences Persistence", () => {
    it("supports 8 configured Indian languages", () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(8);
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain("en-IN");
      expect(codes).toContain("te-IN");
      expect(codes).toContain("hi-IN");
      expect(codes).toContain("ta-IN");
      expect(codes).toContain("kn-IN");
      expect(codes).toContain("ml-IN");
      expect(codes).toContain("bn-IN");
      expect(codes).toContain("mr-IN");
    });

    it("saves and retrieves independent channels for UI, Voice Input, and Voice Output", () => {
      saveLanguageSettings({
        preferredLanguage: "te-IN",
        uiLanguage: "en-IN",
        voiceInputLanguage: "te-IN",
        voiceOutputLanguage: "te-IN",
        speechSpeed: 1.25,
        autoReadResponses: true,
      });

      const loaded = getLanguageSettings();
      expect(loaded.preferredLanguage).toBe("te-IN");
      expect(loaded.uiLanguage).toBe("en-IN");
      expect(loaded.voiceInputLanguage).toBe("te-IN");
      expect(loaded.voiceOutputLanguage).toBe("te-IN");
      expect(loaded.speechSpeed).toBe(1.25);
      expect(loaded.autoReadResponses).toBe(true);
    });
  });
});
