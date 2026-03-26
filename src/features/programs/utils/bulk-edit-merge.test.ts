import { describe, it, expect } from "vitest";
import { planBulkEdit, applyBulkEditToTemplate } from "./bulk-edit-merge";
import type { ActivityTemplateConfig } from "../types/activity-template-config";

function makeTemplate(overrides: Partial<ActivityTemplateConfig> = {}): ActivityTemplateConfig {
  return {
    id: "t1",
    fieldName: "purchase",
    typeValues: ["Purchase"],
    label: "Purchase",
    extensions: [],
    reasonCodes: [],
    validationRules: [],
    ...overrides,
  };
}

// ── planBulkEdit ─────────────────────────────────────────────────────────────

describe("planBulkEdit", () => {
  it("separates replace and merge fields", () => {
    const result = planBulkEdit({
      label: "New Label",
      reasonCodes: ["RC1"],
      _arrayModes: { reasonCodes: "add" },
    });

    expect(result.directUpdate).toEqual({ label: "New Label" });
    expect(result.hasMerge).toBe(true);
  });

  it("returns hasMerge=false when all fields are replace", () => {
    const result = planBulkEdit({
      label: "New Label",
      reasonCodes: ["RC1"],
      _arrayModes: { reasonCodes: "replace" },
    });

    expect(result.directUpdate).toEqual({ label: "New Label", reasonCodes: ["RC1"] });
    expect(result.hasMerge).toBe(false);
  });

  it("handles missing _arrayModes (all fields treated as replace)", () => {
    const result = planBulkEdit({ label: "X", description: "Y" });

    expect(result.directUpdate).toEqual({ label: "X", description: "Y" });
    expect(result.hasMerge).toBe(false);
  });

  it("handles empty update", () => {
    const result = planBulkEdit({});
    expect(result.directUpdate).toEqual({});
    expect(result.hasMerge).toBe(false);
  });
});

// ── applyBulkEditToTemplate — replace mode ───────────────────────────────────

describe("applyBulkEditToTemplate — replace mode", () => {
  it("replaces label", () => {
    const template = makeTemplate({ label: "Old" });
    const result = applyBulkEditToTemplate(template, { label: "New" });
    expect(result.label).toBe("New");
  });

  it("replaces description (clears to undefined when empty string)", () => {
    const template = makeTemplate({ description: "Old desc" });
    const result = applyBulkEditToTemplate(template, { description: "" });
    expect(result.description).toBeUndefined();
  });

  it("replaces divisions", () => {
    const template = makeTemplate({ divisions: ["div1"] });
    const result = applyBulkEditToTemplate(template, { divisions: ["div2", "div3"] });
    expect(result.divisions).toEqual(["div2", "div3"]);
  });

  it("replaces reasonCodes in replace mode", () => {
    const template = makeTemplate({ reasonCodes: ["RC1", "RC2"] });
    const result = applyBulkEditToTemplate(template, {
      reasonCodes: ["RC3"],
      _arrayModes: { reasonCodes: "replace" },
    });
    expect(result.reasonCodes).toEqual(["RC3"]);
  });

  it("replaces extensions in replace mode", () => {
    const template = makeTemplate({
      extensions: [{ id: "e1", name: "color", label: "Color", type: "string" }],
    });
    const newExt = [{ id: "e2", name: "size", label: "Size", type: "number" as const }];
    const result = applyBulkEditToTemplate(template, {
      extensions: newExt,
      _arrayModes: { extensions: "replace" },
    });
    expect(result.extensions).toEqual(newExt);
  });

  it("replaces validationRules in replace mode", () => {
    const template = makeTemplate({
      validationRules: [{ id: "r1", type: "required", field: "amount" }],
    });
    const newRules = [{ id: "r2", type: "min" as const, field: "amount", value: 0 }];
    const result = applyBulkEditToTemplate(template, {
      validationRules: newRules,
      _arrayModes: { validationRules: "replace" },
    });
    expect(result.validationRules).toEqual(newRules);
  });

  it("applies multiple replace fields at once", () => {
    const template = makeTemplate({ label: "Old", description: "Old desc" });
    const result = applyBulkEditToTemplate(template, {
      label: "New",
      description: "New desc",
    });
    expect(result.label).toBe("New");
    expect(result.description).toBe("New desc");
  });
});

// ── applyBulkEditToTemplate — add (merge) mode ──────────────────────────────

describe("applyBulkEditToTemplate — add (merge) mode", () => {
  it("merges reasonCodes with deduplication", () => {
    const template = makeTemplate({ reasonCodes: ["RC1", "RC2"] });
    const result = applyBulkEditToTemplate(template, {
      reasonCodes: ["RC2", "RC3"],
      _arrayModes: { reasonCodes: "add" },
    });
    expect(result.reasonCodes).toEqual(["RC1", "RC2", "RC3"]);
  });

  it("merges extensions, deduplicating by name", () => {
    const existing = [
      { id: "e1", name: "color", label: "Color", type: "string" as const },
    ];
    const incoming = [
      { id: "e2", name: "color", label: "Color v2", type: "string" as const },
      { id: "e3", name: "size", label: "Size", type: "number" as const },
    ];
    const template = makeTemplate({ extensions: existing });
    const result = applyBulkEditToTemplate(template, {
      extensions: incoming,
      _arrayModes: { extensions: "add" },
    });

    expect(result.extensions).toHaveLength(2);
    // Original "color" kept (not replaced by incoming "color")
    expect(result.extensions[0]!.id).toBe("e1");
    expect(result.extensions[1]!.name).toBe("size");
  });

  it("merges validationRules, deduplicating by id", () => {
    const existing = [
      { id: "r1", type: "required" as const, field: "amount" },
    ];
    const incoming = [
      { id: "r1", type: "required" as const, field: "amount" },
      { id: "r2", type: "min" as const, field: "amount", value: 0 },
    ];
    const template = makeTemplate({ validationRules: existing });
    const result = applyBulkEditToTemplate(template, {
      validationRules: incoming,
      _arrayModes: { validationRules: "add" },
    });

    expect(result.validationRules).toHaveLength(2);
    expect(result.validationRules[0]!.id).toBe("r1");
    expect(result.validationRules[1]!.id).toBe("r2");
  });

  it("merges into empty arrays", () => {
    const template = makeTemplate({ reasonCodes: [], extensions: [] });
    const result = applyBulkEditToTemplate(template, {
      reasonCodes: ["RC1"],
      extensions: [{ id: "e1", name: "color", label: "Color", type: "string" }],
      _arrayModes: { reasonCodes: "add", extensions: "add" },
    });
    expect(result.reasonCodes).toEqual(["RC1"]);
    expect(result.extensions).toHaveLength(1);
  });
});

// ── applyBulkEditToTemplate — mixed modes ────────────────────────────────────

describe("applyBulkEditToTemplate — mixed replace + merge", () => {
  it("applies replace to some fields and merge to others", () => {
    const template = makeTemplate({
      label: "Old",
      reasonCodes: ["RC1"],
      extensions: [{ id: "e1", name: "color", label: "Color", type: "string" }],
    });
    const result = applyBulkEditToTemplate(template, {
      label: "New",
      reasonCodes: ["RC2"],
      extensions: [{ id: "e2", name: "size", label: "Size", type: "number" }],
      _arrayModes: { reasonCodes: "add", extensions: "replace" },
    });

    expect(result.label).toBe("New");
    // reasonCodes merged
    expect(result.reasonCodes).toEqual(["RC1", "RC2"]);
    // extensions replaced
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0]!.name).toBe("size");
  });
});

// ── applyBulkEditToTemplate — immutability ───────────────────────────────────

describe("applyBulkEditToTemplate — immutability", () => {
  it("does not mutate the original template", () => {
    const original = makeTemplate({
      label: "Original",
      reasonCodes: ["RC1"],
      extensions: [{ id: "e1", name: "color", label: "Color", type: "string" }],
    });
    const originalJson = JSON.stringify(original);

    applyBulkEditToTemplate(original, {
      label: "Changed",
      reasonCodes: ["RC2"],
      extensions: [{ id: "e2", name: "size", label: "Size", type: "number" }],
      _arrayModes: { reasonCodes: "add", extensions: "add" },
    });

    expect(JSON.stringify(original)).toBe(originalJson);
  });
});
