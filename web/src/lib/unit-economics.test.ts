import { describe, expect, it } from "vitest";

import { breakEvenGyms, tierEconomics } from "./unit-economics";

describe("tierEconomics", () => {
  it("matches the figures the casdey HQ doc carried by hand", () => {
    // HQ, 2026-09-12: Standard €79.20 revenue, about €1.44 Stripe, about
    // €1.10 AI, about €76 margin, about 96%.
    const standard = tierEconomics("standard", 99, 20);
    expect(standard).toMatchObject({ revenue: 79.2, stripe: 1.44, ai: 1.08, whatsapp: 0 });
    expect(standard.margin).toBeCloseTo(76.68, 2);
    expect(standard.marginPct).toBe(97);

    // Pro €231.20, about €3.72 Stripe, €13 WhatsApp in a heavy month, about €213.
    const pro = tierEconomics("pro", 289, 20);
    expect(pro).toMatchObject({ revenue: 231.2, stripe: 3.72, whatsapp: 13 });
    expect(pro.margin).toBeCloseTo(213.4, 1);
  });

  it("reads the list price when there is no discount", () => {
    expect(tierEconomics("standard", 99, 0).revenue).toBe(99);
  });
});

describe("breakEvenGyms", () => {
  it("rounds up, since a fraction of a gym does not pay a bill", () => {
    expect(breakEvenGyms(18.4, 76.68)).toBe(1);
    expect(breakEvenGyms(160, 76.68)).toBe(3);
  });

  it("needs no gyms for no cost, and cannot answer for no margin", () => {
    expect(breakEvenGyms(0, 76)).toBe(0);
    expect(breakEvenGyms(18, 0)).toBeNull();
  });
});
