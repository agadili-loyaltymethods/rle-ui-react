import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { useForm, FormProvider } from "react-hook-form";
import {
  pursePolicySchema,
  pursePolicyConfig,
  buildPursePolicyEditConfig,
  type PurseEditDynamicOptions,
} from "./purse-policy-config";
import type { PursePolicy } from "@/shared/types/policy";

describe("pursePolicySchema", () => {
  it("accepts a valid minimal purse policy", () => {
    const result = pursePolicySchema.safeParse({
      name: "Test Purse",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = pursePolicySchema.safeParse({
      name: "",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(true);
    }
  });

  it("rejects name exceeding max length", () => {
    const result = pursePolicySchema.safeParse({
      name: "x".repeat(251),
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing effectiveDate", () => {
    const result = pursePolicySchema.safeParse({
      name: "Test",
      effectiveDate: "",
      expirationDate: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing expirationDate", () => {
    const result = pursePolicySchema.safeParse({
      name: "Test",
      effectiveDate: "2026-01-01",
      expirationDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = pursePolicySchema.safeParse({
      name: "Full Purse",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      desc: "A description",
      _qualifying: true,
      group: "Tier Credits",
      ptMultiplier: 2.5,
      primary: true,
      overdraftLimit: 100,
      reverseSign: true,
      expirationType: "Custom",
      expiryUnit: "Days",
      expiryValue: 90,
      expirationSnapTo: "now",
      expiryWarningDays: "30,60",
      escrowUnit: "Days",
      escrowValue: 7,
      escrowSnapTo: "now",
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-12-31",
      periodCloseDate: "2027-01-15",
      periodTimezone: "America/New_York",
      aggregates: ["sum", "count"],
      divisions: ["us", "uk"],
      enableAutomaticExpiration: true,
      inactiveDays: 90,
      expirationStartDate: "2026-01-01",
      expirationEndDate: "2026-12-31",
      repeatInterval: 30,
      frequency: "monthly",
    });
    expect(result.success).toBe(true);
  });

  it("coerces ptMultiplier to number", () => {
    const result = pursePolicySchema.safeParse({
      name: "Coerce",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      ptMultiplier: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ptMultiplier).toBe(3);
    }
  });

  it("rejects negative overdraftLimit", () => {
    const result = pursePolicySchema.safeParse({
      name: "Negative OD",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      overdraftLimit: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative expiryValue", () => {
    const result = pursePolicySchema.safeParse({
      name: "Negative",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      expiryValue: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects inactiveDays less than 1", () => {
    const result = pursePolicySchema.safeParse({
      name: "Inactive",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      inactiveDays: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects repeatInterval less than 1", () => {
    const result = pursePolicySchema.safeParse({
      name: "Repeat",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      repeatInterval: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("pursePolicyConfig", () => {
  it("has the correct title", () => {
    expect(pursePolicyConfig.title).toBe("Purse Policies");
  });

  it("has the correct endpoint", () => {
    expect(pursePolicyConfig.endpoint).toBe("pursepolicies");
  });

  it("has the correct basePath", () => {
    expect(pursePolicyConfig.basePath).toBe("/program/purse-policies");
  });

  it("has the correct testIdPrefix", () => {
    expect(pursePolicyConfig.testIdPrefix).toBe("purse");
  });

  it("defines 9 columns including actions", () => {
    expect(pursePolicyConfig.columns).toHaveLength(9);
  });

  it("has expected column accessorKeys", () => {
    const keys = pursePolicyConfig.columns.map(
      (col) => ("accessorKey" in col ? col.accessorKey : col.id),
    );
    expect(keys).toEqual([
      "name",
      "group",
      "primary",
      "ptMultiplier",
      "effectiveDate",
      "expirationDate",
      "expirationType",
      "overdraftLimit",
      "actions",
    ]);
  });

  it("actions column has sorting disabled", () => {
    const actionsCol = pursePolicyConfig.columns.find((c) => "id" in c && c.id === "actions");
    expect(actionsCol).toBeDefined();
    expect(actionsCol!.enableSorting).toBe(false);
  });

  it("renderCard is defined", () => {
    expect(pursePolicyConfig.renderCard).toBeTypeOf("function");
  });
});

describe("buildPursePolicyEditConfig", () => {
  it("returns an EntityEditConfig object", () => {
    const config = buildPursePolicyEditConfig();
    expect(config.entityName).toBe("Purse Policy");
    expect(config.endpoint).toBe("pursepolicies");
    expect(config.testIdPrefix).toBe("purse");
    expect(config.listPath).toBe("/program/purse-policies");
  });

  it("has default values", () => {
    const config = buildPursePolicyEditConfig();
    expect(config.defaultValues).toEqual({
      _qualifying: false,
      ptMultiplier: 1,
      overdraftLimit: 0,
      primary: false,
      reverseSign: false,
      expirationType: "None",
      expirationSnapTo: "now",
      escrowSnapTo: "now",
      enableAutomaticExpiration: false,
      expirationDate: "3000-01-01",
      aggregates: [],
    });
  });

  it("has 3 tabs: general, expiration, escrow", () => {
    const config = buildPursePolicyEditConfig();
    expect(config.tabs).toHaveLength(3);
    expect(config.tabs![0]!.id).toBe("general");
    expect(config.tabs![1]!.id).toBe("expiration");
    expect(config.tabs![2]!.id).toBe("escrow");
  });

  it("general tab has fields", () => {
    const config = buildPursePolicyEditConfig();
    const generalTab = config.tabs![0]!;
    expect(generalTab.fields).toBeDefined();
    expect(generalTab.fields!.length).toBeGreaterThan(0);
    expect(generalTab.columns).toBe(2);
  });

  it("expiration and escrow tabs have renderContent", () => {
    const config = buildPursePolicyEditConfig();
    expect(config.tabs![1]!.renderContent).toBeTypeOf("function");
    expect(config.tabs![2]!.renderContent).toBeTypeOf("function");
  });

  it("expiration tab is hidden for qualifying purses", () => {
    const config = buildPursePolicyEditConfig();
    const expirationTab = config.tabs![1]!;
    // qualifying: has group
    expect(expirationTab.visible!({ group: "Tier Credits" })).toBe(false);
    // non-qualifying: no group
    expect(expirationTab.visible!({ group: "" })).toBe(true);
    expect(expirationTab.visible!({})).toBe(true);
  });

  it("escrow tab is hidden for qualifying purses", () => {
    const config = buildPursePolicyEditConfig();
    const escrowTab = config.tabs![2]!;
    expect(escrowTab.visible!({ group: "Tier" })).toBe(false);
    expect(escrowTab.visible!({ _qualifying: true })).toBe(false);
    expect(escrowTab.visible!({})).toBe(true);
  });

  it("prepareCreate strips _qualifying and adds program", () => {
    const config = buildPursePolicyEditConfig();
    const result = config.prepareCreate!(
      { name: "Test", _qualifying: true, effectiveDate: "2026-01-01" },
      "prog-123",
    );
    expect(result.program).toBe("prog-123");
    expect(result._qualifying).toBeUndefined();
    expect(result.name).toBe("Test");
  });

  it("isReadOnly returns locked for past period end dates", () => {
    const config = buildPursePolicyEditConfig();
    // Past date
    const pastResult = config.isReadOnly!({ periodEndDate: "2020-01-01" });
    expect(pastResult.locked).toBe(true);
    expect(pastResult.message).toBeDefined();

    // No end date
    const noDateResult = config.isReadOnly!({});
    expect(noDateResult.locked).toBe(false);
  });

  it("general tab field visibility: _qualifying only in create mode", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const qualifyingField = fields.find((f) => f.name === "_qualifying");
    expect(qualifyingField).toBeDefined();
    // visible only when no _id (create mode)
    expect(qualifyingField!.visible!({ _id: undefined } as Record<string, unknown>)).toBe(true);
    expect(qualifyingField!.visible!({ _id: "abc" } as Record<string, unknown>)).toBe(false);
  });

  it("general tab field visibility: group field shows based on mode", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const groupField = fields.find((f) => f.name === "group");
    expect(groupField).toBeDefined();
    // In edit mode (_id present), visible only if group is set
    expect(groupField!.visible!({ _id: "abc", group: "G1" } as Record<string, unknown>)).toBe(true);
    expect(groupField!.visible!({ _id: "abc", group: "" } as Record<string, unknown>)).toBe(false);
    // In create mode, visible only if _qualifying is checked
    expect(groupField!.visible!({ _qualifying: true } as Record<string, unknown>)).toBe(true);
    expect(groupField!.visible!({ _qualifying: false } as Record<string, unknown>)).toBe(false);
  });

  it("general tab field: expirationDate is hidden for qualifying", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const expirationDateField = fields.find((f) => f.name === "expirationDate");
    expect(expirationDateField).toBeDefined();
    expect(expirationDateField!.visible!({ group: "G1" } as Record<string, unknown>)).toBe(false);
    expect(expirationDateField!.visible!({} as Record<string, unknown>)).toBe(true);
  });

  it("general tab: qualifying fields visible when qualifying", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const periodFields = ["periodStartDate", "periodEndDate", "periodCloseDate", "periodTimezone", "aggregates"];
    for (const fieldName of periodFields) {
      const field = fields.find((f) => f.name === fieldName);
      expect(field).toBeDefined();
      expect(field!.visible!({ group: "G1" } as Record<string, unknown>)).toBe(true);
      expect(field!.visible!({} as Record<string, unknown>)).toBe(false);
    }
  });

  it("uses dynamic options when provided", () => {
    const dynamicOptions: PurseEditDynamicOptions = {
      groupOptions: [{ value: "g1", label: "Group 1" }],
      timezoneOptions: [{ value: "US/Eastern", label: "US/Eastern" }],
      aggregateTypeOptions: [{ value: "sum", label: "Sum" }],
      snapToOptions: [{ value: "month-end", label: "Month End" }],
      divisionOptions: [{ value: "us", label: "US" }],
    };
    const config = buildPursePolicyEditConfig(dynamicOptions);
    const fields = config.tabs![0]!.fields!;

    const divisionsField = fields.find((f) => f.name === "divisions");
    expect(divisionsField!.options).toEqual(dynamicOptions.divisionOptions);

    const aggregatesField = fields.find((f) => f.name === "aggregates");
    expect(aggregatesField!.options).toEqual(dynamicOptions.aggregateTypeOptions);

    // periodTimezone should be searchable-select when timezone options are provided
    const tzField = fields.find((f) => f.name === "periodTimezone");
    expect(tzField!.type).toBe("searchable-select");
  });

  it("uses text type for periodTimezone when no timezone options", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const tzField = fields.find((f) => f.name === "periodTimezone");
    expect(tzField!.type).toBe("text");
  });

  it("name field is disabled in edit mode", () => {
    const config = buildPursePolicyEditConfig();
    const fields = config.tabs![0]!.fields!;
    const nameField = fields.find((f) => f.name === "name");
    expect(nameField!.disabled!({ _id: "abc" } as Record<string, unknown>)).toBe(true);
    expect(nameField!.disabled!({} as Record<string, unknown>)).toBe(false);
  });

  it("isReadOnly returns locked=false for future period end dates", () => {
    const config = buildPursePolicyEditConfig();
    const futureResult = config.isReadOnly!({ periodEndDate: "3000-01-01" });
    expect(futureResult.locked).toBe(false);
  });
});

describe("pursePolicyConfig column rendering", () => {
  // Helper: create a minimal column rendering context
  function renderCell(accessorKey: string, value: unknown) {
    const col = pursePolicyConfig.columns.find(
      (c) => ("accessorKey" in c && c.accessorKey === accessorKey) || ("id" in c && c.id === accessorKey),
    );
    expect(col).toBeDefined();
    if (!col?.cell) return null;

    const cellFn = col.cell as (info: { getValue: <T>() => T }) => React.ReactNode;
    const result = cellFn({ getValue: () => value as never });
    if (!result) return null;
    const { container } = render(<>{result}</>);
    return container;
  }

  it("name column renders with font-medium", () => {
    const container = renderCell("name", "Test Purse");
    expect(container?.textContent).toBe("Test Purse");
    expect(container?.querySelector(".font-medium")).toBeInTheDocument();
  });

  it("group column renders Badge for non-empty value", () => {
    const container = renderCell("group", "Tier Credits");
    expect(container?.textContent).toContain("Tier Credits");
  });

  it("group column renders None text for empty value", () => {
    const container = renderCell("group", "");
    expect(container?.textContent).toContain("None");
  });

  it("primary column renders Check for true", () => {
    const container = renderCell("primary", true);
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });

  it("primary column renders Minus for false", () => {
    const container = renderCell("primary", false);
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });

  it("ptMultiplier column formats number", () => {
    const container = renderCell("ptMultiplier", 2.5);
    expect(container?.textContent).toContain("2.5");
  });

  it("expirationType column renders None text for empty/None", () => {
    const container = renderCell("expirationType", "None");
    expect(container?.textContent).toContain("None");
  });

  it("expirationType column renders Badge for non-None value", () => {
    const container = renderCell("expirationType", "Custom");
    expect(container?.textContent).toContain("Custom");
  });

  it("expirationType column renders None for empty string", () => {
    const container = renderCell("expirationType", "");
    expect(container?.textContent).toContain("None");
  });

  it("overdraftLimit column formats number", () => {
    const container = renderCell("overdraftLimit", 500);
    expect(container?.textContent).toContain("500");
  });
});

describe("pursePolicyConfig column headers (SortableHeader)", () => {
  it("renders sortable header buttons", () => {
    const col = pursePolicyConfig.columns.find(
      (c) => "accessorKey" in c && c.accessorKey === "name",
    );
    const headerFn = col?.header as (info: { column: { toggleSorting: () => void; getIsSorted: () => false | "asc" | "desc" } }) => React.ReactNode;

    const toggleSorting = vi.fn();
    const result = headerFn({ column: { toggleSorting, getIsSorted: () => false } });
    const { container } = render(<>{result}</>);

    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
    expect(button?.textContent).toContain("Name");

    fireEvent.click(button!);
    expect(toggleSorting).toHaveBeenCalled();
  });

  it("toggleSorting(true) when current sort is asc", () => {
    const col = pursePolicyConfig.columns.find(
      (c) => "accessorKey" in c && c.accessorKey === "name",
    );
    const headerFn = col?.header as (info: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) => React.ReactNode;

    const toggleSorting = vi.fn();
    const result = headerFn({ column: { toggleSorting, getIsSorted: () => "asc" } });
    const { container } = render(<>{result}</>);

    fireEvent.click(container.querySelector("button")!);
    expect(toggleSorting).toHaveBeenCalledWith(true);
  });
});

describe("pursePolicyConfig.renderCard", () => {
  const basePurse: PursePolicy = {
    _id: "purse-1",
    name: "Test Purse",
    desc: "A test purse",
    effectiveDate: "2026-01-01",
    expirationDate: "2026-12-31",
    ptMultiplier: 2.5,
    overdraftLimit: 100,
    primary: true,
    group: "Tier Credits",
    expirationType: "Custom",
    program: "prog-1",
  };

  it("renders card with purse name", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("Test Purse")).toBeInTheDocument();
  });

  it("renders Primary badge when primary is true", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("renders group badge", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("Tier Credits")).toBeInTheDocument();
  });

  it("renders expirationType badge when not None", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("does not render Primary badge when primary is false", () => {
    const purse = { ...basePurse, primary: false };
    const result = pursePolicyConfig.renderCard(purse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.queryByText("Primary")).not.toBeInTheDocument();
  });

  it("does not render group badge when no group", () => {
    const purse = { ...basePurse, group: undefined };
    const result = pursePolicyConfig.renderCard(purse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.queryByText("Tier Credits")).not.toBeInTheDocument();
  });

  it("does not render expirationType badge when None", () => {
    const purse = { ...basePurse, expirationType: "None" };
    const result = pursePolicyConfig.renderCard(purse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    // "Custom" badge should not appear
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit, onDelete: vi.fn() });
    render(<>{result}</>);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete });
    render(<>{result}</>);
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("renders pt multiplier value", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("2.5")).toBeInTheDocument();
  });

  it("renders overdraft value", () => {
    const result = pursePolicyConfig.renderCard(basePurse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});

describe("ExpirationTabContent rendering", () => {
  function TabContentWrapper({ defaultValues, snapToOptions = [] }: { defaultValues: Record<string, unknown>; snapToOptions?: { value: string; label: string }[] }) {
    const config = buildPursePolicyEditConfig({ snapToOptions });
    const expirationTab = config.tabs![1]!;
    const form = useForm({ defaultValues });
    return <FormProvider {...form}>{expirationTab.renderContent!(form, "create")}</FormProvider>;
  }

  it("renders Expiration Type label", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "None" }} />);
    expect(screen.getByText("Expiration Type")).toBeInTheDocument();
  });

  it("shows duration fields when expiration type is Custom", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    expect(screen.getByText("Expiration Duration")).toBeInTheDocument();
    expect(screen.getByText("Snap To")).toBeInTheDocument();
    expect(screen.getByText("Warning Notifications")).toBeInTheDocument();
  });

  it("hides duration fields when expiration type is None", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "None" }} />);
    expect(screen.queryByText("Expiration Duration")).not.toBeInTheDocument();
  });

  it("shows Inactivity Threshold for Activity-Based type", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Activity-Based", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "", inactiveDays: 90 }} />);
    expect(screen.getByText("Inactivity Threshold")).toBeInTheDocument();
  });

  it("hides Inactivity Threshold for Custom type", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    expect(screen.queryByText("Inactivity Threshold")).not.toBeInTheDocument();
  });

  it("renders warning days entries", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "30,60" }} />);
    expect(screen.getByText("Add warning")).toBeInTheDocument();
    // Should show "days before expiry" text for each entry
    const labels = screen.getAllByText("days before expiry");
    expect(labels).toHaveLength(2);
  });

  it("adds a warning day when Add warning is clicked", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    fireEvent.click(screen.getByText("Add warning"));
    expect(screen.getByText("days before expiry")).toBeInTheDocument();
  });

  it("removes a warning day when X button is clicked", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "30,60" }} />);
    // Initially 2 warning days
    expect(screen.getAllByText("days before expiry")).toHaveLength(2);
    // Click the first remove button (X icon button)
    const removeButtons = screen.getAllByRole("button").filter((btn) => btn.querySelector("svg") && btn.closest(".flex.items-center.gap-2"));
    // Find buttons with X icons - they have no text content and are within warning day rows
    const xButtons = screen.getAllByRole("button").filter(
      (btn) => !btn.textContent?.includes("Add") && !btn.textContent?.includes("days") && btn.closest(".flex.items-center.gap-2"),
    );
    if (xButtons.length > 0) {
      fireEvent.click(xButtons[0]!);
      expect(screen.getAllByText("days before expiry")).toHaveLength(1);
    }
  });

  it("adds multiple warning days sequentially", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    fireEvent.click(screen.getByText("Add warning"));
    expect(screen.getAllByText("days before expiry")).toHaveLength(1);
    fireEvent.click(screen.getByText("Add warning"));
    expect(screen.getAllByText("days before expiry")).toHaveLength(2);
  });

  it("renders snap-to options when provided", () => {
    render(
      <TabContentWrapper
        defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }}
        snapToOptions={[{ value: "month-end", label: "Month End" }]}
      />,
    );
    expect(screen.getByText("Snap To")).toBeInTheDocument();
  });
});

describe("EscrowTabContent rendering", () => {
  function EscrowWrapper({ defaultValues, snapToOptions = [] }: { defaultValues: Record<string, unknown>; snapToOptions?: { value: string; label: string }[] }) {
    const config = buildPursePolicyEditConfig({ snapToOptions });
    const escrowTab = config.tabs![2]!;
    const form = useForm({ defaultValues });
    return <FormProvider {...form}>{escrowTab.renderContent!(form, "create")}</FormProvider>;
  }

  it("renders Escrow Duration label", () => {
    render(<EscrowWrapper defaultValues={{ escrowValue: 0, escrowUnit: "__none__", escrowSnapTo: "now" }} />);
    expect(screen.getByText("Escrow Duration")).toBeInTheDocument();
  });

  it("renders Snap To label", () => {
    render(<EscrowWrapper defaultValues={{ escrowValue: 0, escrowUnit: "__none__", escrowSnapTo: "now" }} />);
    expect(screen.getByText("Snap To")).toBeInTheDocument();
  });

  it("renders 'Hold for' prefix text", () => {
    render(<EscrowWrapper defaultValues={{ escrowValue: 7, escrowUnit: "Days", escrowSnapTo: "now" }} />);
    expect(screen.getByText("Hold for")).toBeInTheDocument();
  });

  it("renders snap-to options when provided", () => {
    render(
      <EscrowWrapper
        defaultValues={{ escrowValue: 7, escrowUnit: "Days", escrowSnapTo: "now" }}
        snapToOptions={[{ value: "month-end", label: "Month End" }]}
      />,
    );
    expect(screen.getByText("Snap To")).toBeInTheDocument();
  });
});

describe("InlineSelect rendering via ExpirationTabContent", () => {
  function TabContentWrapper({ defaultValues }: { defaultValues: Record<string, unknown> }) {
    const config = buildPursePolicyEditConfig();
    const expirationTab = config.tabs![1]!;
    const form = useForm({ defaultValues });
    return <FormProvider {...form}>{expirationTab.renderContent!(form, "create")}</FormProvider>;
  }

  it("renders the expiration type selector with None display text", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "None" }} />);
    // The InlineSelect should display "None" text
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders expiry unit selector when expiration is enabled", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    // Should show "Days" in the unit selector
    expect(screen.getByText("Days")).toBeInTheDocument();
  });

  it("renders the Expire after label text", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Custom", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "" }} />);
    expect(screen.getByText("Expire after")).toBeInTheDocument();
  });

  it("renders the days of inactivity text for Activity-Based", () => {
    render(<TabContentWrapper defaultValues={{ expirationType: "Activity-Based", expiryValue: 30, expiryUnit: "Days", expiryWarningDays: "", inactiveDays: 90 }} />);
    expect(screen.getByText("days of inactivity")).toBeInTheDocument();
  });
});

describe("pursePolicyConfig.renderCard with no expirationType", () => {
  it("does not render expiration badge when expirationType is undefined", () => {
    const purse: PursePolicy = {
      _id: "purse-noexp",
      name: "No Exp",
      effectiveDate: "2026-01-01",
      expirationDate: "2026-12-31",
      ptMultiplier: 1,
      overdraftLimit: 0,
      primary: false,
      program: "prog-1",
    };
    const result = pursePolicyConfig.renderCard(purse, { onEdit: vi.fn(), onDelete: vi.fn() });
    render(<>{result}</>);
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity-Based")).not.toBeInTheDocument();
  });
});

describe("column cell rendering edge cases", () => {
  function renderCell(accessorKey: string, value: unknown) {
    const col = pursePolicyConfig.columns.find(
      (c) => ("accessorKey" in c && c.accessorKey === accessorKey) || ("id" in c && c.id === accessorKey),
    );
    if (!col?.cell) return null;
    const cellFn = col.cell as (info: { getValue: <T>() => T }) => React.ReactNode;
    const result = cellFn({ getValue: () => value as never });
    if (!result) return null;
    const { container } = render(<>{result}</>);
    return container;
  }

  it("effectiveDate column formats date string", () => {
    const container = renderCell("effectiveDate", "2026-06-15");
    expect(container?.textContent).toBeTruthy();
  });

  it("expirationDate column formats date string", () => {
    const container = renderCell("expirationDate", "2026-12-31");
    expect(container?.textContent).toBeTruthy();
  });

  it("actions column header returns null", () => {
    const col = pursePolicyConfig.columns.find((c) => "id" in c && c.id === "actions");
    const headerFn = col?.header as () => React.ReactNode;
    expect(headerFn()).toBeNull();
  });

  it("actions column cell returns null", () => {
    const col = pursePolicyConfig.columns.find((c) => "id" in c && c.id === "actions");
    const cellFn = col?.cell as () => React.ReactNode;
    expect(cellFn()).toBeNull();
  });
});
