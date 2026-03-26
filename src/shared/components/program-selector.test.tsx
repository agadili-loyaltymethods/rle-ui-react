import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import { ProgramSelector } from "./program-selector";
import { useUIStore } from "@/shared/stores/ui-store";

vi.mock("@/shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/features/programs/hooks/use-programs", () => ({
  usePrograms: vi.fn(() => ({
    data: {
      data: [
        { _id: "prog-1", name: "Program Alpha" },
        { _id: "prog-2", name: "Program Beta" },
      ],
    },
    isLoading: false,
  })),
}));

import { usePrograms } from "@/features/programs/hooks/use-programs";

const routerOpts = { routerEntries: ["/"] };

describe("ProgramSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState({ currentProgram: "prog-1", currentProgramName: "Program Alpha" });
  });

  it("renders trigger button", () => {
    render(<ProgramSelector />, routerOpts);
    expect(screen.getByTestId("program-selector-trigger")).toBeInTheDocument();
  });

  it("shows current program name", () => {
    render(<ProgramSelector />, routerOpts);
    expect(screen.getByText("Program Alpha")).toBeInTheDocument();
  });

  it("shows 'Select program' when no program is selected and no programs available", () => {
    vi.mocked(usePrograms).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as never);
    mockUIState({ currentProgram: null, currentProgramName: null });
    render(<ProgramSelector />, routerOpts);
    expect(screen.getByText("Select program")).toBeInTheDocument();
    vi.mocked(usePrograms).mockRestore();
  });

  it("shows Loading... when programs are loading", () => {
    vi.mocked(usePrograms).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
    } as never);
    mockUIState({ currentProgram: null, currentProgramName: null });
    render(<ProgramSelector />, routerOpts);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("opens dropdown when trigger is clicked", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByTestId("program-selector-dropdown")).toBeInTheDocument();
  });

  it("shows all programs in the dropdown", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByTestId("program-option-prog-1")).toBeInTheDocument();
    expect(screen.getByTestId("program-option-prog-2")).toBeInTheDocument();
  });

  it("selects a program when clicked in dropdown", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    fireEvent.click(screen.getByTestId("program-option-prog-2"));

    const state = useUIStore.getState();
    expect(state.currentProgram).toBe("prog-2");
    expect(state.currentProgramName).toBe("Program Beta");
  });

  it("closes dropdown after selecting a program", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByTestId("program-selector-dropdown")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("program-option-prog-2"));
    expect(screen.queryByTestId("program-selector-dropdown")).not.toBeInTheDocument();
  });

  it("toggles dropdown closed when trigger is clicked again", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByTestId("program-selector-dropdown")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.queryByTestId("program-selector-dropdown")).not.toBeInTheDocument();
  });

  it("closes dropdown on click outside", () => {
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByTestId("program-selector-dropdown")).toBeInTheDocument();

    // Click outside the component
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("program-selector-dropdown")).not.toBeInTheDocument();
  });

  it("auto-selects first program when none is selected", () => {
    mockUIState({ currentProgram: null, currentProgramName: null });
    render(<ProgramSelector />, routerOpts);

    const state = useUIStore.getState();
    expect(state.currentProgram).toBe("prog-1");
    expect(state.currentProgramName).toBe("Program Alpha");
  });

  it("shows empty message when no programs available", () => {
    vi.mocked(usePrograms).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as never);
    mockUIState({ currentProgram: null, currentProgramName: null });
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByText("No programs available")).toBeInTheDocument();
    vi.mocked(usePrograms).mockRestore();
  });

  it("shows loading message in dropdown when loading with no data", () => {
    vi.mocked(usePrograms).mockReturnValue({
      data: { data: [] },
      isLoading: true,
    } as never);
    render(<ProgramSelector />, routerOpts);
    fireEvent.click(screen.getByTestId("program-selector-trigger"));
    expect(screen.getByText("Loading programs...")).toBeInTheDocument();
    vi.mocked(usePrograms).mockRestore();
  });
});
