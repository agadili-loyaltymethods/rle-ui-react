import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { useForm, FormProvider } from "react-hook-form";
import { tierPolicySchema, tierPolicyEditConfig } from "./tier-policy-config";

vi.mock("../components/tier-level-editor", () => ({
  TierLevelEditor: ({ levels }: { levels: unknown[] }) => (
    <div data-testid="tier-level-editor">Levels: {levels.length}</div>
  ),
}));

describe("tierPolicySchema", () => {
  it("accepts a valid tier policy", () => {
    const result = tierPolicySchema.safeParse({
      name: "Gold Tier Group",
      primary: true,
      levels: [{ name: "Base", number: 1, threshold: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = tierPolicySchema.safeParse({
      name: "",
      levels: [{ name: "Base", number: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty levels array", () => {
    const result = tierPolicySchema.safeParse({
      name: "Test",
      levels: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("levels"))).toBe(true);
    }
  });

  it("rejects level with empty name", () => {
    const result = tierPolicySchema.safeParse({
      name: "Test",
      levels: [{ name: "", number: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects level with number less than 1", () => {
    const result = tierPolicySchema.safeParse({
      name: "Test",
      levels: [{ name: "Base", number: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts level with optional fields", () => {
    const result = tierPolicySchema.safeParse({
      name: "Full",
      levels: [
        {
          name: "Gold",
          number: 1,
          threshold: 1000,
          color: "#FFD700",
          defaultLevel: true,
          expiryUnit: "Days",
          expiryValue: 365,
          expirationSnapTo: "month-end",
          expiryWarningDays: [30, 7],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative threshold", () => {
    const result = tierPolicySchema.safeParse({
      name: "Test",
      levels: [{ name: "Base", number: 1, threshold: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple levels", () => {
    const result = tierPolicySchema.safeParse({
      name: "Multi",
      levels: [
        { name: "Silver", number: 1, threshold: 0 },
        { name: "Gold", number: 2, threshold: 500 },
        { name: "Platinum", number: 3, threshold: 1000 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("tierPolicyEditConfig", () => {
  it("has the correct entityName", () => {
    expect(tierPolicyEditConfig.entityName).toBe("Tier Group");
  });

  it("has the correct endpoint", () => {
    expect(tierPolicyEditConfig.endpoint).toBe("tierpolicies");
  });

  it("has the correct testIdPrefix", () => {
    expect(tierPolicyEditConfig.testIdPrefix).toBe("tier");
  });

  it("has the correct listPath", () => {
    expect(tierPolicyEditConfig.listPath).toBe("/program/tier-groups");
  });

  it("has default values with a base level", () => {
    expect(tierPolicyEditConfig.defaultValues).toEqual({
      primary: false,
      levels: [{ name: "Base", number: 1, threshold: 0, color: "#888888", defaultLevel: true }],
    });
  });

  it("has 2 tabs: general and levels", () => {
    expect(tierPolicyEditConfig.tabs).toHaveLength(2);
    expect(tierPolicyEditConfig.tabs![0]!.id).toBe("general");
    expect(tierPolicyEditConfig.tabs![1]!.id).toBe("levels");
  });

  it("general tab has fields for name and primary", () => {
    const generalTab = tierPolicyEditConfig.tabs![0]!;
    expect(generalTab.fields).toHaveLength(2);
    expect(generalTab.fields![0]!.name).toBe("name");
    expect(generalTab.fields![1]!.name).toBe("primary");
  });

  it("levels tab has renderContent", () => {
    const levelsTab = tierPolicyEditConfig.tabs![1]!;
    expect(levelsTab.renderContent).toBeTypeOf("function");
  });

  it("prepareCreate adds program id", () => {
    const result = tierPolicyEditConfig.prepareCreate!(
      { name: "Test", levels: [] },
      "prog-1",
    );
    expect(result.program).toBe("prog-1");
    expect(result.name).toBe("Test");
  });

  describe("levels tab renderContent", () => {
    function LevelsTabWrapper({ defaultValues }: { defaultValues: Record<string, unknown> }) {
      const form = useForm({ defaultValues });
      const levelsTab = tierPolicyEditConfig.tabs![1]!;
      return <FormProvider {...form}>{levelsTab.renderContent!(form, "edit")}</FormProvider>;
    }

    it("renders TierLevelEditor with form levels", () => {
      render(
        <LevelsTabWrapper
          defaultValues={{
            name: "Test",
            levels: [{ name: "Base", number: 1, threshold: 0 }],
          }}
        />,
      );
      expect(screen.getByTestId("tier-level-editor")).toBeInTheDocument();
      expect(screen.getByText("Levels: 1")).toBeInTheDocument();
    });

    it("renders with empty levels", () => {
      render(<LevelsTabWrapper defaultValues={{ name: "Test", levels: [] }} />);
      expect(screen.getByText("Levels: 0")).toBeInTheDocument();
    });
  });
});
