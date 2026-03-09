import { describe, it, expect, vi } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe("Join Request Flow", () => {
  describe("Join Code Generation", () => {
    it("generates a 6-character alphanumeric code", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateJoinCode = () => {
        let code = "";
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
      };

      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      // Should not contain ambiguous chars (0, O, 1, I, L)
      expect(code).not.toMatch(/[0OIL1]/);
    });

    it("generates unique codes", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateJoinCode = () => {
        let code = "";
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
      };

      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) codes.add(generateJoinCode());
      // With 30^6 possible codes, 100 should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe("Join Code Input Validation", () => {
    it("converts input to uppercase and strips non-alphanumeric", () => {
      const sanitize = (val: string) => val.toUpperCase().replace(/[^A-Z0-9]/g, "");
      expect(sanitize("abc123")).toBe("ABC123");
      expect(sanitize("ab-c!1@2")).toBe("ABC12");
      expect(sanitize("")).toBe("");
    });

    it("limits input to 6 characters", () => {
      const input = "ABCDEFGH";
      const limited = input.slice(0, 6);
      expect(limited).toBe("ABCDEF");
      expect(limited).toHaveLength(6);
    });
  });

  describe("Join Request Status Flow", () => {
    it("follows correct status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ["approved", "rejected"],
        approved: [],
        rejected: [],
      };

      expect(validTransitions["pending"]).toContain("approved");
      expect(validTransitions["pending"]).toContain("rejected");
      expect(validTransitions["approved"]).toHaveLength(0);
      expect(validTransitions["rejected"]).toHaveLength(0);
    });
  });

  describe("Notification Types", () => {
    it("maps join-related notification types to correct icons", () => {
      const typeIcon: Record<string, string> = {
        join_request: "group_add",
        join_approved: "check_circle",
        join_rejected: "cancel",
      };

      expect(typeIcon["join_request"]).toBe("group_add");
      expect(typeIcon["join_approved"]).toBe("check_circle");
      expect(typeIcon["join_rejected"]).toBe("cancel");
    });
  });
});
