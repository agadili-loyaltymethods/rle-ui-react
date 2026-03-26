import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { Select } from "./select";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("Select", () => {
  it("renders trigger with placeholder when no value selected", () => {
    render(
      <Select
        value={undefined}
        onChange={vi.fn()}
        options={options}
        placeholder="Pick one"
      />,
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });

  it("renders trigger with selected option label", () => {
    render(
      <Select
        value="a"
        onChange={vi.fn()}
        options={options}
      />,
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  describe("error state", () => {
    it("sets aria-invalid when error prop is true", () => {
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={options}
          error={true}
        />,
      );
      expect(screen.getByTestId("select-select-trigger")).toHaveAttribute("aria-invalid", "true");
    });

    it("does not set aria-invalid when error prop is false", () => {
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={options}
          error={false}
        />,
      );
      expect(screen.getByTestId("select-select-trigger")).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("disabled state", () => {
    it("disables trigger when disabled is true", () => {
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={options}
          disabled={true}
        />,
      );
      expect(screen.getByTestId("select-select-trigger")).toBeDisabled();
    });
  });

  describe("selecting an option", () => {
    it("calls onChange with the selected value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select
          value={undefined}
          onChange={onChange}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("select-select-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("select-select-option-b")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("select-select-option-b"));

      expect(onChange).toHaveBeenCalledWith("b");
    });
  });

  describe("search filtering", () => {
    it("filters options based on search input", async () => {
      const user = userEvent.setup();
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("select-select-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("select-select-option-a")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "Gam");

      await waitFor(() => {
        expect(screen.queryByTestId("select-select-option-a")).not.toBeInTheDocument();
        expect(screen.queryByTestId("select-select-option-b")).not.toBeInTheDocument();
        expect(screen.getByTestId("select-select-option-c")).toBeInTheDocument();
      });
    });

    it("shows no results message when search yields nothing", async () => {
      const user = userEvent.setup();
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("select-select-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("select-select-option-a")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "zzzzz");

      await waitFor(() => {
        expect(screen.getByText("No results found")).toBeInTheDocument();
      });
    });
  });

  describe("grouped options", () => {
    it("renders group labels when grouped is true", async () => {
      const user = userEvent.setup();
      const groupedOptions = [
        { label: "Group 1", options: [{ value: "a", label: "Alpha" }] },
        { label: "Group 2", options: [{ value: "b", label: "Beta" }] },
      ];
      render(
        <Select
          value={undefined}
          onChange={vi.fn()}
          options={groupedOptions}
          grouped={true}
        />,
      );

      await user.click(screen.getByTestId("select-select-trigger"));
      await waitFor(() => {
        expect(screen.getByText("Group 1")).toBeInTheDocument();
        expect(screen.getByText("Group 2")).toBeInTheDocument();
      });
    });
  });

  describe("custom renderOption", () => {
    it("uses custom renderOption when provided", async () => {
      const user = userEvent.setup();
      render(
        <Select
          value="a"
          onChange={vi.fn()}
          options={options}
          renderOption={(option) => <span data-testid={`custom-${option.value}`}>Custom: {option.label}</span>}
        />,
      );

      // The trigger should show the custom render for the selected option
      expect(screen.getByTestId("custom-a")).toBeInTheDocument();
      expect(screen.getByText("Custom: Alpha")).toBeInTheDocument();

      // Open popover - all options should use custom render
      await user.click(screen.getByTestId("select-select-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("custom-b")).toBeInTheDocument();
        expect(screen.getByText("Custom: Beta")).toBeInTheDocument();
      });
    });
  });
});
