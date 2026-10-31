import { describe, it, expect } from "vitest";
import { validateEmail } from "../utils/emailValidator";

describe("Email Format Validator & Typo Detection", () => {
  describe("Valid Email Formats", () => {
    it("accepts standard valid email addresses like @gmail.com", () => {
      const res1 = validateEmail("user@gmail.com");
      expect(res1.isValid).toBe(true);
      expect(res1.error).toBeUndefined();

      const res2 = validateEmail("john.doe@fintech.org");
      expect(res2.isValid).toBe(true);

      const res3 = validateEmail("alex_123+filter@company.co.in");
      expect(res3.isValid).toBe(true);

      const res4 = validateEmail("malipedditarun789@gmail.com");
      expect(res4.isValid).toBe(true);
    });
  });

  describe("Invalid Email Formats & Incomplete TLDs (e.g. @gmail.c)", () => {
    it("flags @gmail.c as invalid and provides @gmail.com suggestion", () => {
      const res = validateEmail("user@gmail.c");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid domain");
      expect(res.suggestion).toBe("user@gmail.com");
    });

    it("flags 1-letter top level domains as invalid", () => {
      const res = validateEmail("contact@domain.c");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Top-level domain must be at least 2 characters");
    });

    it("detects common domain typos like @gmail.co or @gmail.cm", () => {
      const res = validateEmail("test@gmail.co");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Did you mean '@gmail.com'?");
      expect(res.suggestion).toBe("test@gmail.com");
    });

    it("rejects emails missing top-level domain extension (e.g. user@gmail)", () => {
      const res = validateEmail("user@gmail");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Domain must include an extension");
    });

    it("rejects emails missing the domain part after '@' (e.g. user@)", () => {
      const res = validateEmail("user@");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Enter the domain after '@'");
    });

    it("rejects emails missing the local identifier before '@' (e.g. @gmail.com)", () => {
      const res = validateEmail("@gmail.com");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Enter the name/identifier before '@'");
    });

    it("rejects strings without an '@' symbol", () => {
      const res = validateEmail("plainaddress");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("must include an '@' symbol");
    });

    it("rejects emails with multiple '@' symbols", () => {
      const res = validateEmail("user@@gmail.com");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("cannot contain more than one '@'");
    });

    it("rejects empty or whitespace-only strings", () => {
      const res1 = validateEmail("");
      expect(res1.isValid).toBe(false);

      const res2 = validateEmail("   ");
      expect(res2.isValid).toBe(false);
    });
  });
});
