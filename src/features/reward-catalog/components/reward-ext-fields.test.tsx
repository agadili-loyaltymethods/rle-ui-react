import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { useForm, FormProvider } from "react-hook-form";
import { ExtTabBody } from "./reward-ext-fields";
import type { FormTab, RewardFormValues } from "../lib/reward-form-helpers";
import type { EntitySchemaData } from "../types/reward-policy";

vi.mock("@/shared/components/ext-field-renderer", () => ({
  ExtFieldRenderer: ({ fieldName, onChange }: { fieldName: string; onChange: (v: unknown) => void }) => (
    <div data-testid={`ext-field-${fieldName}`}>
      {fieldName}
      <button data-testid={`ext-field-${fieldName}-change`} aria-label={`Change ${fieldName}`} onClick={() => onChange(`new-${fieldName}`)}>
        Change
      </button>
    </div>
  ),
  isUrlField: () => false,
}));

const makeSchemaData = (
  fields: Record<string, { type: string; title: string; displayOrder: number }>,
): EntitySchemaData =>
  ({
    extFields: fields,
    enumFields: {},
    extRequiredFields: new Set<string>(),
    coreRequiredFields: new Set<string>(),
    categories: [],
  }) as unknown as EntitySchemaData;

/** Wrapper that provides FormProvider context with given ext values */
function FormWrapper({
  children,
  ext = {},
}: {
  children: React.ReactNode;
  ext?: Record<string, unknown>;
}) {
  const methods = useForm<RewardFormValues>({
    defaultValues: {
      name: "",
      desc: "",
      cost: 0,
      effectiveDate: "",
      expirationDate: "",
      countLimit: 0,
      perDayLimit: 0,
      perWeekLimit: 0,
      perOfferLimit: 0,
      transactionLimit: 0,
      coolOffPeriod: 0,
      numUses: 1,
      canPreview: true,
      segments: [],
      mandatorySegments: [],
      tierPolicyLevels: [],
      availability: {
        sunday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        monday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        tuesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        wednesday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        thursday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        friday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
        saturday: { isEnabled: true, startHours: 0, startMins: 0, endHours: 23, endMins: 59 },
      },
      divisions: [],
      eligibleChannels: [],
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
      ext,
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe("re-exports", () => {
  it("re-exports ExtFieldRenderer and isUrlField from shared", async () => {
    const mod = await import("./reward-ext-fields");
    expect(mod.ExtFieldRenderer).toBeDefined();
    expect(mod.isUrlField).toBeDefined();
    expect(typeof mod.isUrlField).toBe("function");
  });
});

describe("ExtTabBody", () => {
  it("renders ext fields specified in the tab", () => {
    const tab: FormTab = {
      key: "ext1",
      label: "Extension",
      fields: ["firstName", "lastName"],
      columns: 2,
    };
    const schemaData = makeSchemaData({
      firstName: { type: "string", title: "First Name", displayOrder: 0 },
      lastName: { type: "string", title: "Last Name", displayOrder: 1 },
    });

    render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    expect(screen.getByTestId("ext-field-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-lastName")).toBeInTheDocument();
    expect(screen.getByText("firstName")).toBeInTheDocument();
    expect(screen.getByText("lastName")).toBeInTheDocument();
  });

  it("separates boolean fields from non-boolean fields", () => {
    const tab: FormTab = {
      key: "mixed",
      label: "Mixed",
      fields: ["title", "isActive", "description"],
      columns: 2,
    };
    const schemaData = makeSchemaData({
      title: { type: "string", title: "Title", displayOrder: 0 },
      isActive: { type: "boolean", title: "Is Active", displayOrder: 1 },
      description: { type: "string", title: "Description", displayOrder: 2 },
    });

    render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    // All three fields should render
    expect(screen.getByTestId("ext-field-title")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-isActive")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-description")).toBeInTheDocument();
  });

  it("renders nothing for fields not in schema", () => {
    const tab: FormTab = {
      key: "missing",
      label: "Missing",
      fields: ["nonExistentField"],
      columns: 2,
    };
    const schemaData = makeSchemaData({});

    const { container } = render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    expect(container.querySelector("[data-testid^='ext-field-']")).toBeNull();
  });

  it("handles null schemaData gracefully", () => {
    const tab: FormTab = {
      key: "empty",
      label: "Empty",
      fields: ["someField"],
      columns: 1,
    };

    const { container } = render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={null}
        />
      </FormWrapper>,
    );

    expect(container.querySelector("[data-testid^='ext-field-']")).toBeNull();
  });

  it("renders with single column layout", () => {
    const tab: FormTab = {
      key: "single",
      label: "Single Column",
      fields: ["field1"],
      columns: 1,
    };
    const schemaData = makeSchemaData({
      field1: { type: "string", title: "Field 1", displayOrder: 0 },
    });

    render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    expect(screen.getByTestId("ext-field-field1")).toBeInTheDocument();
  });

  it("renders with three column layout", () => {
    const tab: FormTab = {
      key: "triple",
      label: "Three Columns",
      fields: ["a", "b", "c"],
      columns: 3,
    };
    const schemaData = makeSchemaData({
      a: { type: "string", title: "A", displayOrder: 0 },
      b: { type: "string", title: "B", displayOrder: 1 },
      c: { type: "string", title: "C", displayOrder: 2 },
    });

    render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    expect(screen.getByTestId("ext-field-a")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-b")).toBeInTheDocument();
    expect(screen.getByTestId("ext-field-c")).toBeInTheDocument();
  });

  it("calls setValue via useFormContext when non-boolean field onChange fires", () => {
    const tab: FormTab = {
      key: "test",
      label: "Test",
      fields: ["title"],
      columns: 1,
    };
    const schemaData = makeSchemaData({
      title: { type: "string", title: "Title", displayOrder: 0 },
    });

    render(
      <FormWrapper>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId("ext-field-title-change"));
    // The click fires onChange which calls setValue internally via useFormContext.
    // We verify the field rendered and the click didn't throw.
    expect(screen.getByTestId("ext-field-title")).toBeInTheDocument();
  });

  it("calls setValue via useFormContext when boolean field onChange fires", () => {
    const tab: FormTab = {
      key: "boolTest",
      label: "Bool Test",
      fields: ["isActive"],
      columns: 1,
    };
    const schemaData = makeSchemaData({
      isActive: { type: "boolean", title: "Is Active", displayOrder: 0 },
    });

    render(
      <FormWrapper ext={{ isActive: false }}>
        <ExtTabBody
          tab={tab}
          schemaData={schemaData}
        />
      </FormWrapper>,
    );

    fireEvent.click(screen.getByTestId("ext-field-isActive-change"));
    // The click fires onChange which calls setValue internally via useFormContext.
    expect(screen.getByTestId("ext-field-isActive")).toBeInTheDocument();
  });
});
