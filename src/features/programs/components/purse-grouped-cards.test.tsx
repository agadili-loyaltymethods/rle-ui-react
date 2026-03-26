import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { PurseGroupedCards } from "./purse-grouped-cards";
import type { PurseDisplayEntry } from "../utils/group-purse-policies";
import type { PursePolicy } from "@/shared/types/policy";

const mockPolicy: PursePolicy = {
  _id: "p1",
  name: "Test Policy",
  program: "prog1",
  purse: "purse1",
  primary: false,
  ptMultiplier: 1.0,
  overdraftLimit: 0,
  effectiveDate: "2025-01-01",
  expirationDate: "2026-01-01",
} as PursePolicy;

const mockPrimaryPolicy: PursePolicy = {
  _id: "p2",
  name: "Primary Policy",
  program: "prog1",
  purse: "purse2",
  primary: true,
  ptMultiplier: 2.5,
  overdraftLimit: 100,
  effectiveDate: "2025-01-01",
  expirationDate: "2026-12-31",
} as PursePolicy;

describe("PurseGroupedCards", () => {
  it("renders standalone entry with policy name", () => {
    const entries: PurseDisplayEntry[] = [
      { type: "standalone", policy: mockPolicy },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Test Policy")).toBeInTheDocument();
  });

  it("renders standalone entry with Non-qualifying badge", () => {
    const entries: PurseDisplayEntry[] = [
      { type: "standalone", policy: mockPolicy },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Non-qualifying")).toBeInTheDocument();
  });

  it("renders Primary badge for primary policy", () => {
    const entries: PurseDisplayEntry[] = [
      { type: "standalone", policy: mockPrimaryPolicy },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("renders group entry with group name", () => {
    const entries: PurseDisplayEntry[] = [
      {
        type: "group",
        groupName: "Main Purse",
        policies: [mockPolicy],
      },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Main Purse")).toBeInTheDocument();
    expect(screen.getByText("Qualifying")).toBeInTheDocument();
  });

  it("shows period count badge in group entry", () => {
    const entries: PurseDisplayEntry[] = [
      {
        type: "group",
        groupName: "Multi Period",
        policies: [mockPolicy, mockPrimaryPolicy],
      },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("2 periods")).toBeInTheDocument();
  });

  it("shows singular period badge for single policy group", () => {
    const entries: PurseDisplayEntry[] = [
      {
        type: "group",
        groupName: "Single",
        policies: [mockPolicy],
      },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("1 period")).toBeInTheDocument();
  });

  it("renders expanded group showing period details", () => {
    const policyWithPeriod: PursePolicy = {
      ...mockPolicy,
      _id: "pp1",
      name: "Period 1",
      periodStartDate: "2025-01-01",
      periodEndDate: "2027-06-30",
    } as PursePolicy;

    const entries: PurseDisplayEntry[] = [
      {
        type: "group",
        groupName: "Expanded Group",
        policies: [policyWithPeriod],
      },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set(["Expanded Group"])}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Periods")).toBeInTheDocument();
    expect(screen.getByText("Period 1")).toBeInTheDocument();
    expect(screen.getByTestId("purse-period-card-pp1")).toBeInTheDocument();
  });

  it("renders edit and delete buttons for standalone cards", () => {
    const entries: PurseDisplayEntry[] = [
      { type: "standalone", policy: mockPolicy },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Edit")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("renders card with correct data-testid for standalone", () => {
    const entries: PurseDisplayEntry[] = [
      { type: "standalone", policy: mockPolicy },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByTestId("purse-card-p1")).toBeInTheDocument();
  });

  it("renders card with correct data-testid for group", () => {
    const entries: PurseDisplayEntry[] = [
      {
        type: "group",
        groupName: "TestGroup",
        policies: [mockPolicy],
      },
    ];
    render(
      <PurseGroupedCards
        entries={entries}
        expandedGroups={new Set()}
        onToggleGroup={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("purse-group-card-TestGroup"),
    ).toBeInTheDocument();
  });

  describe("onToggleGroup", () => {
    it("calls onToggleGroup when expand button is clicked on group card", () => {
      const onToggleGroup = vi.fn();
      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "ToggleMe", policies: [mockPolicy] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set()}
          onToggleGroup={onToggleGroup}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTitle("Expand"));
      expect(onToggleGroup).toHaveBeenCalledWith("ToggleMe");
    });

    it("shows Collapse title when group is expanded", () => {
      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "Expanded", policies: [mockPolicy] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["Expanded"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByTitle("Collapse")).toBeInTheDocument();
    });
  });

  describe("standalone card actions", () => {
    it("calls onEdit when edit button is clicked on standalone card", () => {
      const onEdit = vi.fn();
      const entries: PurseDisplayEntry[] = [
        { type: "standalone", policy: mockPolicy },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set()}
          onToggleGroup={vi.fn()}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTitle("Edit"));
      expect(onEdit).toHaveBeenCalledWith(mockPolicy);
    });

    it("calls onDelete when delete button is clicked on standalone card", () => {
      const onDelete = vi.fn();
      const entries: PurseDisplayEntry[] = [
        { type: "standalone", policy: mockPolicy },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set()}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />,
      );
      fireEvent.click(screen.getByTitle("Delete"));
      expect(onDelete).toHaveBeenCalledWith(mockPolicy);
    });
  });

  describe("expanded period card actions", () => {
    const policyWithPeriod: PursePolicy = {
      ...mockPolicy,
      _id: "pp-exp",
      name: "Exp Period",
      periodStartDate: "2025-01-01",
      periodEndDate: "3000-06-30",
    } as PursePolicy;

    it("calls onEdit when edit button is clicked on an expanded period card", () => {
      const onEdit = vi.fn();
      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "G1", policies: [policyWithPeriod] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["G1"])}
          onToggleGroup={vi.fn()}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      );
      // Period edit button title is "Edit" for future periods
      const periodCard = screen.getByTestId("purse-period-card-pp-exp");
      const editBtn = periodCard.querySelector('button[title="Edit"]')!;
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(policyWithPeriod);
    });

    it("calls onDelete when delete button is clicked on an expanded period card", () => {
      const onDelete = vi.fn();
      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "G1", policies: [policyWithPeriod] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["G1"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />,
      );
      const periodCard = screen.getByTestId("purse-period-card-pp-exp");
      const deleteBtn = periodCard.querySelector('button[title="Delete"]')!;
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith(policyWithPeriod);
    });
  });

  describe("isPeriodPast rendering", () => {
    it("shows Closed badge and View title for past period", () => {
      const pastPolicy: PursePolicy = {
        ...mockPolicy,
        _id: "pp-past",
        name: "Past",
        periodStartDate: "2020-01-01",
        periodEndDate: "2020-06-30",
      } as PursePolicy;

      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "PastG", policies: [pastPolicy] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["PastG"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByText("Closed")).toBeInTheDocument();
      // Past period edit button should say "View"
      const periodCard = screen.getByTestId("purse-period-card-pp-past");
      expect(periodCard.querySelector('button[title="View"]')).toBeInTheDocument();
      // Delete button should NOT be present for past periods
      expect(periodCard.querySelector('button[title="Delete"]')).not.toBeInTheDocument();
    });

    it("shows Open badge for future period", () => {
      const futurePolicy: PursePolicy = {
        ...mockPolicy,
        _id: "pp-future",
        name: "Future",
        periodStartDate: "2025-01-01",
        periodEndDate: "3000-12-31",
      } as PursePolicy;

      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "FutureG", policies: [futurePolicy] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["FutureG"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  describe("period details rendering", () => {
    it("shows periodCloseDate when present", () => {
      const policyWithClose: PursePolicy = {
        ...mockPolicy,
        _id: "pp-close",
        name: "With Close",
        periodStartDate: "2025-01-01",
        periodEndDate: "3000-06-30",
        periodCloseDate: "3000-07-15",
      } as PursePolicy;

      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "CG", policies: [policyWithClose] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["CG"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByText(/Close:/)).toBeInTheDocument();
    });

    it("shows periodTimezone when present", () => {
      const policyWithTz: PursePolicy = {
        ...mockPolicy,
        _id: "pp-tz",
        name: "With TZ",
        periodStartDate: "2025-01-01",
        periodEndDate: "3000-06-30",
        periodTimezone: "America/Chicago",
      } as PursePolicy;

      const entries: PurseDisplayEntry[] = [
        { type: "group", groupName: "TZG", policies: [policyWithTz] },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set(["TZG"])}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByText("America/Chicago")).toBeInTheDocument();
    });
  });

  describe("standalone card badges", () => {
    it("shows expirationType badge when not None", () => {
      const policyWithExpiry: PursePolicy = {
        ...mockPolicy,
        expirationType: "Custom",
      } as PursePolicy;
      const entries: PurseDisplayEntry[] = [
        { type: "standalone", policy: policyWithExpiry },
      ];
      render(
        <PurseGroupedCards
          entries={entries}
          expandedGroups={new Set()}
          onToggleGroup={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
  });
});
