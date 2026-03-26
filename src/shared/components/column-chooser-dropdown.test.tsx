import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { ColumnChooserDropdown } from "./column-chooser-dropdown";
import { createRef } from "react";
import type { ChooserState, ChooserColumn } from "@/shared/hooks/use-column-chooser";

function makeChooserState(overrides: Partial<ChooserState> = {}): ChooserState {
  return {
    open: true,
    pos: { top: 100, left: 200 },
    panelRef: createRef<HTMLDivElement>(),
    btnRef: createRef<HTMLButtonElement>(),
    searchRef: createRef<HTMLInputElement>(),
    search: "",
    setSearch: vi.fn(),
    openChooser: vi.fn(),
    setAllVisible: vi.fn(),
    invertColumns: vi.fn(),
    toggleColumn: vi.fn(),
    dragOverCol: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    handleDragEnd: vi.fn(),
    ...overrides,
  };
}

function makeColumnOrder() {
  return [
    { key: "name", visible: true },
    { key: "status", visible: true },
    { key: "email", visible: false },
  ];
}

function makeColumnMap(): Map<string, ChooserColumn> {
  const map = new Map<string, ChooserColumn>();
  map.set("name", { key: "name", label: "Name", defaultVisible: true });
  map.set("status", { key: "status", label: "Status", defaultVisible: true });
  map.set("email", { key: "email", label: "Email", defaultVisible: false });
  return map;
}

describe("ColumnChooserDropdown", () => {
  it("exports a component function", () => {
    expect(typeof ColumnChooserDropdown).toBe("function");
  });

  it("renders nothing when chooser is not open", () => {
    const { container } = render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ open: false })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    // Portal renders to body, but with open: false it returns null
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when pos is null", () => {
    const { container } = render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ pos: null as unknown as { top: number; left: number } })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders column labels when open", () => {
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState()}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState()}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    expect(screen.getByPlaceholderText("Search columns...")).toBeInTheDocument();
  });

  it("renders All, None, Invert buttons", () => {
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState()}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Invert")).toBeInTheDocument();
  });

  it("displays correct visible/total count", () => {
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState()}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    // 2 visible out of 3 total
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("calls setAllVisible(true) when All button is clicked", () => {
    const setAllVisible = vi.fn();
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ setAllVisible })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    fireEvent.click(screen.getByText("All"));
    expect(setAllVisible).toHaveBeenCalledWith(true);
  });

  it("calls setAllVisible(false) when None button is clicked", () => {
    const setAllVisible = vi.fn();
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ setAllVisible })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    fireEvent.click(screen.getByText("None"));
    expect(setAllVisible).toHaveBeenCalledWith(false);
  });

  it("calls invertColumns when Invert button is clicked", () => {
    const invertColumns = vi.fn();
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ invertColumns })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    fireEvent.click(screen.getByText("Invert"));
    expect(invertColumns).toHaveBeenCalled();
  });

  it("calls toggleColumn when a column checkbox is clicked", () => {
    const toggleColumn = vi.fn();
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ toggleColumn })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]!);
    expect(toggleColumn).toHaveBeenCalledWith("name");
  });

  it("filters columns based on search text", () => {
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ search: "sta" })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
  });

  it("calls setSearch when search input changes", () => {
    const setSearch = vi.fn();
    render(
      <ColumnChooserDropdown
        chooser={makeChooserState({ setSearch })}
        columnOrder={makeColumnOrder()}
        columnMap={makeColumnMap()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search columns..."), {
      target: { value: "email" },
    });
    expect(setSearch).toHaveBeenCalledWith("email");
  });
});
