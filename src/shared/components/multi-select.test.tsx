import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test-utils";
import { MultiSelect, SearchableSelect } from "./multi-select";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("MultiSelect", () => {
  it("renders trigger with placeholder when no values selected", () => {
    render(
      <MultiSelect
        value={[]}
        onChange={vi.fn()}
        options={options}
        placeholder="Pick items"
      />,
    );
    expect(screen.getByText("Pick items")).toBeInTheDocument();
  });

  describe("selected items", () => {
    it("shows chips for selected values", () => {
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={vi.fn()}
          options={options}
          maxDisplayChips={5}
        />,
      );
      expect(screen.getByTestId("multiselect-multiselect-chip-a")).toBeInTheDocument();
      expect(screen.getByTestId("multiselect-multiselect-chip-b")).toBeInTheDocument();
    });
  });

  describe("opening popover", () => {
    it("shows options when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));

      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
        expect(screen.getByTestId("multiselect-multiselect-option-b")).toBeInTheDocument();
        expect(screen.getByTestId("multiselect-multiselect-option-c")).toBeInTheDocument();
      });
    });
  });

  describe("selecting and deselecting options", () => {
    it("calls onChange with new value when option is selected", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={[]}
          onChange={onChange}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("multiselect-multiselect-option-a"));

      expect(onChange).toHaveBeenCalledWith(["a"]);
    });

    it("calls onChange without value when selected option is clicked again", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={onChange}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("multiselect-multiselect-option-a"));

      expect(onChange).toHaveBeenCalledWith(["b"]);
    });
  });

  describe("clear all", () => {
    it("shows clear all button when more than one item is selected", () => {
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={vi.fn()}
          options={options}
          maxDisplayChips={5}
        />,
      );
      expect(screen.getByLabelText("Clear all")).toBeInTheDocument();
    });

    it("does not show clear all button when one or fewer items selected", () => {
      render(
        <MultiSelect
          value={["a"]}
          onChange={vi.fn()}
          options={options}
          maxDisplayChips={5}
        />,
      );
      expect(screen.queryByLabelText("Clear all")).not.toBeInTheDocument();
    });

    it("calls onChange with empty array when clear all is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={onChange}
          options={options}
          maxDisplayChips={5}
        />,
      );

      await user.click(screen.getByLabelText("Clear all"));
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe("remove chip", () => {
    it("calls onChange without removed value when chip X is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={onChange}
          options={options}
          maxDisplayChips={5}
        />,
      );

      await user.click(screen.getByLabelText("Remove Alpha"));
      expect(onChange).toHaveBeenCalledWith(["b"]);
    });
  });

  describe("disabled state", () => {
    it("disables trigger when disabled prop is true", () => {
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={options}
          disabled={true}
        />,
      );
      expect(screen.getByTestId("multiselect-multiselect-trigger")).toBeDisabled();
    });
  });

  describe("no results", () => {
    it("shows no results message when search matches nothing", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search...");
      await user.type(searchInput, "zzzzz");

      await waitFor(() => {
        expect(screen.getByText("No results found")).toBeInTheDocument();
      });
    });
  });

  describe("bulk actions", () => {
    it("selects all options when All button is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a"]}
          onChange={onChange}
          options={options}
          showBulkActions
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      expect(onChange).toHaveBeenCalledWith(["a", "b", "c"]);
    });

    it("deselects all options when None button is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={onChange}
          options={options}
          showBulkActions
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByText("None")).toBeInTheDocument();
      });
      await user.click(screen.getByText("None"));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("inverts selection when Invert button is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <MultiSelect
          value={["a"]}
          onChange={onChange}
          options={options}
          showBulkActions
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByText("Invert")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Invert"));
      expect(onChange).toHaveBeenCalledWith(["b", "c"]);
    });

    it("shows selection count in bulk actions", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={["a", "b"]}
          onChange={vi.fn()}
          options={options}
          showBulkActions
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByText("2/3")).toBeInTheDocument();
      });
    });
  });

  describe("search filtering", () => {
    it("filters options by search text", async () => {
      const user = userEvent.setup();
      render(
        <MultiSelect
          value={[]}
          onChange={vi.fn()}
          options={options}
        />,
      );

      await user.click(screen.getByTestId("multiselect-multiselect-trigger"));
      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText("Search..."), "alp");

      await waitFor(() => {
        expect(screen.getByTestId("multiselect-multiselect-option-a")).toBeInTheDocument();
        expect(screen.queryByTestId("multiselect-multiselect-option-b")).not.toBeInTheDocument();
        expect(screen.queryByTestId("multiselect-multiselect-option-c")).not.toBeInTheDocument();
      });
    });
  });
});

describe("SearchableSelect", () => {
  it("renders trigger with placeholder when no value selected", () => {
    render(
      <SearchableSelect
        value=""
        onChange={vi.fn()}
        options={options}
        placeholder="Choose one"
      />,
    );
    expect(screen.getByText("Choose one")).toBeInTheDocument();
  });

  it("shows selected option label", () => {
    render(
      <SearchableSelect
        value="b"
        onChange={vi.fn()}
        options={options}
      />,
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onChange when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={onChange}
        options={options}
      />,
    );

    await user.click(screen.getByTestId("searchable-select-trigger"));
    await waitFor(() => {
      expect(screen.getByTestId("searchable-select-option-b")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("searchable-select-option-b"));

    expect(onChange).toHaveBeenCalledWith("b");
  });
});
