import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { Select, SelectTrigger, SelectValue } from "./select";

describe("Select", () => {
  it("renders trigger without crashing", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders trigger with error prop without crashing", () => {
    render(
      <Select>
        <SelectTrigger error>
          <SelectValue placeholder="Required" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders disabled trigger", () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
