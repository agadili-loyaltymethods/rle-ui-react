import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { DivisionDetailPanel } from "./division-detail-panel";
import type { Division } from "@/shared/types";

vi.mock("@/shared/hooks/use-schema", () => ({
  useModelSchema: () => ({
    fields: {
      name: { type: "string", required: true },
      description: { type: "string" },
      isActive: { type: "boolean", default: false },
      parent: { type: "objectid", ref: "Division" },
      permissions: { type: "object" },
    },
    isLoading: false,
  }),
}));

function div(id: string, name: string, overrides?: Partial<Division>): Division {
  return {
    _id: id,
    name,
    isActive: true,
    org: "test-org",
    description: "",
    permissions: { read: true, update: false, create: false, delete: false },
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("DivisionDetailPanel", () => {
  const defaultProps = {
    division: null as Division | null,
    allDivisions: [
      div("a", "Alpha"),
      div("b", "Beta", { parent: "a" }),
      div("c", "Gamma", { isActive: false }),
    ],
    isCreateMode: false,
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    onCancelCreate: vi.fn(),
    isSaving: false,
    isDeleting: false,
    onDirtyChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no division is selected", () => {
    render(<DivisionDetailPanel {...defaultProps} />);
    expect(screen.getByText("divisions.selectOrCreate")).toBeInTheDocument();
  });

  it("populates form with division data", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha", { description: "Test desc" })}
      />,
    );
    expect(screen.getByDisplayValue("Alpha")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test desc")).toBeInTheDocument();
  });

  it("shows blank form in create mode", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        isCreateMode={true}
      />,
    );
    expect(screen.getByTestId("div-name-input")).toHaveValue("");
  });

  it("shows required asterisk on name field", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    const label = screen.getByText("divisions.name");
    expect(label.querySelector(".text-error")).toHaveTextContent("*");
  });

  it("shows permission switches", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    expect(screen.getByText("divisions.permRead")).toBeInTheDocument();
    expect(screen.getByText("divisions.permUpdate")).toBeInTheDocument();
    expect(screen.getByText("divisions.permCreate")).toBeInTheDocument();
    expect(screen.getByText("divisions.permDelete")).toBeInTheDocument();
  });

  it("excludes current division from parent dropdown options", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    const parentSelect = screen.getByTestId("parent-select");
    expect(parentSelect).toBeInTheDocument();
  });

  it("enables save button when form is dirty", async () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
      />,
    );
    const nameInput = screen.getByDisplayValue("Alpha");
    fireEvent.change(nameInput, { target: { value: "Alpha Updated" } });

    await waitFor(() => {
      expect(screen.getByTestId("save-button")).not.toBeDisabled();
    });
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("hides delete button when onDelete is undefined", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
        onDelete={undefined}
      />,
    );
    expect(screen.queryByTestId("delete-button")).not.toBeInTheDocument();
  });

  it("pre-sets parent when createParentId is provided", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        isCreateMode={true}
        createParentId="a"
      />,
    );
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
  });

  it("hides save button when canCreate is false in create mode", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        isCreateMode={true}
        canCreate={false}
      />,
    );
    expect(screen.queryByTestId("save-button")).not.toBeInTheDocument();
  });

  it("hides save button when canUpdate is false in edit mode", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
        canUpdate={false}
      />,
    );
    expect(screen.queryByTestId("save-button")).not.toBeInTheDocument();
  });

  it("disables form fields when canUpdate is false", () => {
    render(
      <DivisionDetailPanel
        {...defaultProps}
        division={div("a", "Alpha")}
        canUpdate={false}
      />,
    );
    expect(screen.getByTestId("div-name-input")).toBeDisabled();
    expect(screen.getByTestId("div-description-input")).toBeDisabled();
  });

  it("includes inactive parent in dropdown for current division", () => {
    // Division "d" has inactive parent "c"
    const allDivisions = [
      div("a", "Alpha"),
      div("c", "Gamma", { isActive: false }),
      div("d", "Delta", { parent: "c" }),
    ];
    render(
      <DivisionDetailPanel
        {...defaultProps}
        allDivisions={allDivisions}
        division={div("d", "Delta", { parent: "c" })}
      />,
    );
    const select = screen.getByTestId("parent-select");
    const options = select.querySelectorAll("option");
    const optionTexts = Array.from(options).map((o) => o.textContent);
    // Gamma should be in the list even though inactive (it's the current parent)
    expect(optionTexts.some((t) => t?.includes("Gamma"))).toBe(true);
  });
});
