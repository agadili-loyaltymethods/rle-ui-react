import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/lib/format-utils", () => ({
  generateObjectId: vi.fn(() => "mock-object-id"),
}));

import { createDefaultRewardCatalogItem } from "./reward-defaults";

describe("reward-defaults", () => {
  it("exports createDefaultRewardCatalogItem", () => {
    expect(createDefaultRewardCatalogItem).toBeTypeOf("function");
  });

  it("creates a reward item with given programId and orgId", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 5);

    expect(item._id).toBe("mock-object-id");
    expect(item.program).toBe("prog-1");
    expect(item.org).toBe("org-1");
    expect(item.sortOrder).toBe(5);
  });

  it("sets sensible defaults", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 0);

    expect(item.name).toBe("");
    expect(item.intendedUse).toBe("Reward");
    expect(item.numUses).toBe(1);
    expect(item.canPreview).toBe(true);
    expect(item.singleUse).toBe(true);
    expect(item.segments).toEqual([]);
    expect(item.mandatorySegments).toEqual([]);
  });

  it("sets effectiveDate as ISO string", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 0);

    expect(item.effectiveDate).toBeTruthy();
    expect(() => new Date(item.effectiveDate)).not.toThrow();
  });

  it("sets expirationDate to far future", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 0);

    expect(item.expirationDate).toBe("2029-12-31T23:59:59.999Z");
  });

  it("includes default availability for all days", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 0);

    expect(item.availability).toHaveProperty("monday");
    expect(item.availability).toHaveProperty("sunday");
    expect(item.availability.monday.isEnabled).toBe(true);
  });

  it("includes ext with defaults", () => {
    const item = createDefaultRewardCatalogItem("prog-1", "org-1", 0);

    expect(item.ext).toHaveProperty("configType", "Marketplace Reward");
    expect(item.ext).toHaveProperty("_meta");
    expect(item.ext._meta).toEqual({
      subType: "RewardsCatalog",
      redemptionType: "auto-redeem",
      voucherValidValue: 0,
      voucherValidUnit: "Days",
      ffmntType: "Discount",
      ffmntPartner: "",
      ffmntDeliveryMethod: "",
      ffmntCurrency: "",
      ffmntPoints: 0,
      ffmntExpirationType: "None",
      ffmntExpiryValue: 0,
      ffmntExpiryUnit: "Days",
      ffmntExpirationSnapTo: "now",
      ffmntInactiveDays: 0,
      ffmntEscrowValue: 0,
      ffmntEscrowUnit: "None",
      ffmntEscrowSnapTo: "now",
      ffmntTierPolicy: "",
      ffmntTierLevel: "",
      ffmntTierUseDefaults: true,
      ffmntTierDurationValue: 0,
      ffmntTierDurationUnit: "Days",
    });
  });
});
