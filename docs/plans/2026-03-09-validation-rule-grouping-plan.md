# Validation Rule Grouping (AND/OR) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AND/OR grouping with recursive nesting (max 3 levels) to activity template validation rules.

**Architecture:** Add a `ValidationRuleGroup` type that wraps rules and other groups in a tree. The root of the tree is always a group. The existing flat `validationRules: ValidationRuleDef[]` on `ActivityTemplateConfig` becomes `validationRules: (ValidationRuleDef | ValidationRuleGroup)[]` — the root group's children. Old flat arrays are auto-wrapped on load. The UI replaces the flat sidebar list with a recursive `RuleGroupNode` component that renders nested cards with operator toggles.

**Tech Stack:** React 19, TypeScript, Zod, Radix UI, Lucide icons, CVA, Tailwind CSS 4

---

### Task 1: Add Types and Zod Schemas

**Files:**
- Modify: `src/features/programs/types/activity-template-config.ts`

**Step 1: Add the `ValidationRuleGroup` interface and type guard**

Add after the existing `ValidationRuleDef` interface (line 45):

```typescript
export interface ValidationRuleGroup {
  id: string;
  operator: "and" | "or";
  children: ValidationRuleNode[];
}

/** A node in the validation rule tree — either a leaf rule or a group. */
export type ValidationRuleNode = ValidationRuleDef | ValidationRuleGroup;

/** Type guard: true when node is a group (has `operator`), false when it's a leaf rule. */
export function isRuleGroup(node: ValidationRuleNode): node is ValidationRuleGroup {
  return "operator" in node && !("type" in node);
}
```

**Step 2: Add Zod schema for groups**

Add a lazy recursive schema after `validationRuleSchema` (line 78):

```typescript
export const validationRuleNodeSchema: z.ZodType<ValidationRuleNode> = z.lazy(() =>
  z.union([validationRuleSchema, validationRuleGroupSchema]),
);

export const validationRuleGroupSchema: z.ZodType<ValidationRuleGroup> = z.object({
  id: z.string(),
  operator: z.enum(["and", "or"]),
  children: z.array(z.lazy(() => validationRuleNodeSchema)),
});
```

**Step 3: Update `ActivityTemplateConfig` to accept both formats**

Change `validationRules` field type on the interface (line 19):

```typescript
validationRules: ValidationRuleNode[];
```

Update `activityTemplateConfigSchema` (line 93):

```typescript
validationRules: z.array(validationRuleNodeSchema),
```

**Step 4: Add operator options constant**

```typescript
export const GROUP_OPERATOR_OPTIONS = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
] as const;
```

**Step 5: Add helper to count all leaf rules in a tree**

```typescript
/** Count all leaf rules (non-group nodes) in a rule tree. */
export function countLeafRules(nodes: ValidationRuleNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (isRuleGroup(node)) {
      count += countLeafRules(node.children);
    } else {
      count++;
    }
  }
  return count;
}

/** Collect all leaf rules from a tree into a flat array. */
export function flattenRules(nodes: ValidationRuleNode[]): ValidationRuleDef[] {
  const result: ValidationRuleDef[] = [];
  for (const node of nodes) {
    if (isRuleGroup(node)) {
      result.push(...flattenRules(node.children));
    } else {
      result.push(node);
    }
  }
  return result;
}

/** Get the depth of a node in a tree. Returns 0 for root-level nodes. */
export function getNodeDepth(nodes: ValidationRuleNode[], targetId: string, currentDepth = 0): number {
  for (const node of nodes) {
    if (node.id === targetId) return currentDepth;
    if (isRuleGroup(node)) {
      const found = getNodeDepth(node.children, targetId, currentDepth + 1);
      if (found >= 0) return found;
    }
  }
  return -1;
}
```

**Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: Type errors in `activity-template-edit-page.tsx` (expected — we'll fix those in later tasks)

**Step 7: Commit**

```bash
git add src/features/programs/types/activity-template-config.ts
git commit -m "feat: add ValidationRuleGroup types and helpers for rule grouping"
```

---

### Task 2: Write Unit Tests for Tree Helpers

**Files:**
- Create: `src/features/programs/types/activity-template-config.test.ts`

**Step 1: Write tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  isRuleGroup,
  countLeafRules,
  flattenRules,
  getNodeDepth,
  type ValidationRuleDef,
  type ValidationRuleGroup,
  type ValidationRuleNode,
} from "./activity-template-config";

const rule1: ValidationRuleDef = { id: "r1", type: "required", field: ["name"] };
const rule2: ValidationRuleDef = { id: "r2", type: "min", field: "age", value: 18 };
const rule3: ValidationRuleDef = { id: "r3", type: "pattern", field: "email", value: "^.+@.+$" };

const innerGroup: ValidationRuleGroup = {
  id: "g2",
  operator: "or",
  children: [rule2, rule3],
};

const rootNodes: ValidationRuleNode[] = [rule1, innerGroup];

describe("isRuleGroup", () => {
  it("returns true for group nodes", () => {
    expect(isRuleGroup(innerGroup)).toBe(true);
  });

  it("returns false for rule nodes", () => {
    expect(isRuleGroup(rule1)).toBe(false);
  });
});

describe("countLeafRules", () => {
  it("counts flat rules", () => {
    expect(countLeafRules([rule1, rule2])).toBe(2);
  });

  it("counts rules inside groups", () => {
    expect(countLeafRules(rootNodes)).toBe(3);
  });

  it("returns 0 for empty array", () => {
    expect(countLeafRules([])).toBe(0);
  });
});

describe("flattenRules", () => {
  it("returns all leaf rules in order", () => {
    expect(flattenRules(rootNodes)).toEqual([rule1, rule2, rule3]);
  });

  it("returns empty array for empty input", () => {
    expect(flattenRules([])).toEqual([]);
  });
});

describe("getNodeDepth", () => {
  it("returns 0 for root-level nodes", () => {
    expect(getNodeDepth(rootNodes, "r1")).toBe(0);
  });

  it("returns 0 for root-level groups", () => {
    expect(getNodeDepth(rootNodes, "g2")).toBe(0);
  });

  it("returns 1 for nodes inside a group", () => {
    expect(getNodeDepth(rootNodes, "r2")).toBe(1);
  });

  it("returns -1 for unknown ids", () => {
    expect(getNodeDepth(rootNodes, "unknown")).toBe(-1);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/features/programs/types/activity-template-config.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/features/programs/types/activity-template-config.test.ts
git commit -m "test: add unit tests for validation rule tree helpers"
```

---

### Task 3: Update State Management in Edit Page

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`

This task updates the internal state from a flat `ValidationRuleDef[]` to `ValidationRuleNode[]`, updates all the mutation helpers, and updates the rule count badge. The UI rendering (Task 4) is separate.

**Step 1: Update imports**

Add new imports from `activity-template-config`:

```typescript
import type {
  // ... existing imports ...
  ValidationRuleGroup,
  ValidationRuleNode,
} from "../types/activity-template-config";
import {
  // ... existing imports ...
  GROUP_OPERATOR_OPTIONS,
  isRuleGroup,
  countLeafRules,
  flattenRules,
  getNodeDepth,
} from "../types/activity-template-config";
```

**Step 2: Change state type**

Change line 1122:
```typescript
// Old:
const [validationRules, setValidationRules] = React.useState<ValidationRuleDef[]>([]);
// New:
const [validationRules, setValidationRules] = React.useState<ValidationRuleNode[]>([]);
```

**Step 3: Add tree mutation helpers**

Replace `handleAddRule`, `updateSelectedRule`, `handleDeleteRule` (lines 1588-1615) with tree-aware versions:

```typescript
// ── Tree mutation helpers ──

/** Recursively update a node by ID in the tree. */
const updateNodeInTree = (
  nodes: ValidationRuleNode[],
  nodeId: string,
  updater: (node: ValidationRuleNode) => ValidationRuleNode,
): ValidationRuleNode[] =>
  nodes.map((n) => {
    if (n.id === nodeId) return updater(n);
    if (isRuleGroup(n)) {
      const updated = updateNodeInTree(n.children, nodeId, updater);
      return updated !== n.children ? { ...n, children: updated } : n;
    }
    return n;
  });

/** Recursively remove a node by ID from the tree. */
const removeNodeFromTree = (
  nodes: ValidationRuleNode[],
  nodeId: string,
): ValidationRuleNode[] => {
  const result: ValidationRuleNode[] = [];
  for (const n of nodes) {
    if (n.id === nodeId) continue;
    if (isRuleGroup(n)) {
      result.push({ ...n, children: removeNodeFromTree(n.children, nodeId) });
    } else {
      result.push(n);
    }
  }
  return result;
};

/** Insert a node as the last child of a given group, or at the root if groupId is null. */
const insertNodeInTree = (
  nodes: ValidationRuleNode[],
  groupId: string | null,
  newNode: ValidationRuleNode,
): ValidationRuleNode[] => {
  if (groupId === null) return [...nodes, newNode];
  return nodes.map((n) => {
    if (n.id === groupId && isRuleGroup(n)) {
      return { ...n, children: [...n.children, newNode] };
    }
    if (isRuleGroup(n)) {
      return { ...n, children: insertNodeInTree(n.children, groupId, newNode) };
    }
    return n;
  });
};

/** Find the parent group ID of a node (null if at root). */
const findParentGroupId = (
  nodes: ValidationRuleNode[],
  targetId: string,
  parentId: string | null = null,
): string | null | undefined => {
  for (const n of nodes) {
    if (n.id === targetId) return parentId;
    if (isRuleGroup(n)) {
      const found = findParentGroupId(n.children, targetId, n.id);
      if (found !== undefined) return found;
    }
  }
  return undefined; // not found
};

// Currently selected rule (leaf only, not groups)
const selectedRule = React.useMemo(
  () => flattenRules(validationRules).find((r) => r.id === selectedRuleId) ?? null,
  [validationRules, selectedRuleId],
);

// Currently selected group (if a group is selected)
const selectedGroup = React.useMemo(() => {
  if (!selectedRuleId) return null;
  const find = (nodes: ValidationRuleNode[]): ValidationRuleGroup | null => {
    for (const n of nodes) {
      if (n.id === selectedRuleId && isRuleGroup(n)) return n;
      if (isRuleGroup(n)) {
        const found = find(n.children);
        if (found) return found;
      }
    }
    return null;
  };
  return find(validationRules);
}, [validationRules, selectedRuleId]);

const handleAddRule = (parentGroupId: string | null = null) => {
  const newRule: ValidationRuleDef = {
    id: generateObjectId(),
    type: "required",
    field: [],
  };
  setValidationRules((prev) => insertNodeInTree(prev, parentGroupId, newRule));
  setSelectedRuleId(newRule.id);
  setPristineRuleIds((prev) => new Set(prev).add(newRule.id));
};

const handleAddGroup = (parentGroupId: string | null = null) => {
  // Enforce max depth of 3
  if (parentGroupId !== null) {
    const parentDepth = getNodeDepth(validationRules, parentGroupId);
    if (parentDepth >= 2) return; // depth 2 parent → child would be depth 3 (0-indexed), too deep
  }
  const newGroup: ValidationRuleGroup = {
    id: generateObjectId(),
    operator: "and",
    children: [],
  };
  setValidationRules((prev) => insertNodeInTree(prev, parentGroupId, newGroup));
  setSelectedRuleId(newGroup.id);
};

const updateSelectedRule = (patch: Partial<ValidationRuleDef>) => {
  if (!selectedRuleId) return;
  setPristineRuleIds((prev) => {
    if (!prev.has(selectedRuleId)) return prev;
    const next = new Set(prev);
    next.delete(selectedRuleId);
    return next;
  });
  setValidationRules((prev) =>
    updateNodeInTree(prev, selectedRuleId, (n) => ({ ...n, ...patch })),
  );
};

const updateGroupOperator = (groupId: string, operator: "and" | "or") => {
  setValidationRules((prev) =>
    updateNodeInTree(prev, groupId, (n) => ({ ...n, operator })),
  );
};

const handleDeleteRule = (nodeId: string) => {
  setValidationRules((prev) => removeNodeFromTree(prev, nodeId));
  if (selectedRuleId === nodeId) setSelectedRuleId(null);
};

/** Delete a group, promoting its children to the parent. */
const handleDeleteGroup = (groupId: string) => {
  setValidationRules((prev) => {
    const promote = (nodes: ValidationRuleNode[]): ValidationRuleNode[] => {
      const result: ValidationRuleNode[] = [];
      for (const n of nodes) {
        if (n.id === groupId && isRuleGroup(n)) {
          // Promote children to this level
          result.push(...n.children);
        } else if (isRuleGroup(n)) {
          result.push({ ...n, children: promote(n.children) });
        } else {
          result.push(n);
        }
      }
      return result;
    };
    return promote(prev);
  });
  if (selectedRuleId === groupId) setSelectedRuleId(null);
};
```

**Step 4: Update `ruleIssues` to traverse the tree**

Replace the `ruleIssues` useMemo (lines 1390-1420):

```typescript
const ruleIssues = React.useMemo(() => {
  const issues = new Map<string, string>();
  const allRules = flattenRules(validationRules);

  // Missing target field(s) — skip pristine rules
  for (const rule of allRules) {
    if (pristineRuleIds.has(rule.id)) continue;
    const empty = Array.isArray(rule.field) ? rule.field.length === 0 : !rule.field;
    if (empty) {
      issues.set(rule.id, Array.isArray(rule.field) ? "At least one target field is required" : "Target field is required");
    }
  }

  // Duplicate (type, field) combos
  const seen = new Map<string, string>();
  for (const rule of allRules) {
    const fields = Array.isArray(rule.field) ? rule.field : rule.field ? [rule.field] : [];
    for (const f of fields) {
      const key = `${rule.type}:${f}`;
      const existingId = seen.get(key);
      if (existingId && existingId !== rule.id) {
        issues.set(rule.id, "Duplicate rule (overlapping field + rule type)");
        if (!issues.has(existingId)) {
          issues.set(existingId, "Duplicate rule (overlapping field + rule type)");
        }
      } else {
        seen.set(key, rule.id);
      }
    }
  }

  // Empty groups
  const checkEmptyGroups = (nodes: ValidationRuleNode[]) => {
    for (const n of nodes) {
      if (isRuleGroup(n)) {
        if (n.children.length === 0) {
          issues.set(n.id, "Group is empty — add rules or remove the group");
        }
        checkEmptyGroups(n.children);
      }
    }
  };
  checkEmptyGroups(validationRules);

  return issues;
}, [validationRules, pristineRuleIds]);
```

**Step 5: Update `validate()` to use `flattenRules`**

In the `validate` function (lines 1466-1471), change the loop:

```typescript
// Old:
for (const rule of validationRules) {
// New:
for (const rule of flattenRules(validationRules)) {
```

**Step 6: Update the validation tab badge to count leaf rules**

In the tab rendering (line 1795-1797), change:

```typescript
// Old:
{tab.value === "validation" && validationRules.length > 0 && (
  <Badge variant="secondary" className="ml-1">{validationRules.length}</Badge>
)}
// New:
{tab.value === "validation" && countLeafRules(validationRules) > 0 && (
  <Badge variant="secondary" className="ml-1">{countLeafRules(validationRules)}</Badge>
)}
```

**Step 7: Update `handleDeleteField` to use tree-aware removal**

Replace the `setValidationRules` call in `handleDeleteField` (lines 1575-1579):

```typescript
const handleDeleteField = (fieldId: string) => {
  setExtensions((prev) => prev.filter((f) => f.id !== fieldId));
  const deleted = extensions.find((f) => f.id === fieldId);
  if (deleted) {
    const fieldPath = `ext.${deleted.name}`;
    const removeReferences = (nodes: ValidationRuleNode[]): ValidationRuleNode[] =>
      nodes
        .filter((n) => {
          if (isRuleGroup(n)) return true;
          return n.field !== fieldPath && n.conditionField !== fieldPath;
        })
        .map((n) =>
          isRuleGroup(n) ? { ...n, children: removeReferences(n.children) } : n,
        );
    setValidationRules((prev) => removeReferences(prev));
  }
};
```

**Step 8: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: May still have errors in the UI rendering code (will fix in Task 4)

**Step 9: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git commit -m "feat: update validation rule state to support tree structure"
```

---

### Task 4: Build Recursive Rule Tree UI

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`

This task replaces the flat rule list sidebar (lines 2214-2283) with a recursive tree component, and adds a group detail panel for when a group is selected.

**Step 1: Add `FolderTree` icon import**

Add to the lucide-react import block:

```typescript
import { ..., FolderTree } from "lucide-react";
```

**Step 2: Create inline `RuleGroupNode` component**

Add this component before the main `ActivityTemplateEditPage` default export function (or inside it as a nested function — whichever is consistent with the file's pattern of `ExtensionFieldModal`, `SearchableFieldPicker`, etc.):

```typescript
/** Recursive component for rendering a validation rule group in the sidebar tree. */
function RuleGroupNode({
  group,
  depth,
  selectedRuleId,
  onSelectNode,
  onAddRule,
  onAddGroup,
  onDeleteGroup,
  onToggleOperator,
  ruleIssues,
  resolveFieldLabel,
  pristineRuleIds,
}: {
  group: { id: string; operator: "and" | "or"; children: ValidationRuleNode[] };
  depth: number;
  selectedRuleId: string | null;
  onSelectNode: (id: string) => void;
  onAddRule: (parentGroupId: string) => void;
  onAddGroup: (parentGroupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onToggleOperator: (groupId: string, operator: "and" | "or") => void;
  ruleIssues: Map<string, string>;
  resolveFieldLabel: (field: string) => string;
  pristineRuleIds: Set<string>;
}) {
  const isRoot = depth === 0;
  const hasIssue = ruleIssues.has(group.id);
  // Check if any descendant has issues (for error propagation)
  const hasDescendantIssue = React.useMemo(() => {
    const check = (nodes: ValidationRuleNode[]): boolean =>
      nodes.some((n) => {
        if (ruleIssues.has(n.id)) return true;
        if (isRuleGroup(n)) return check(n.children);
        return false;
      });
    return check(group.children);
  }, [group.children, ruleIssues]);

  return (
    <div
      className={cn(
        !isRoot && "ml-3 rounded-lg border bg-card p-2 mb-1",
        !isRoot && hasIssue && "border-error/50",
        !isRoot && !hasIssue && "border-border",
      )}
      data-testid={`rule-group-${group.id}`}
    >
      {/* Group header with operator toggle */}
      <div className={cn(
        "flex items-center gap-2 mb-1",
        isRoot ? "px-1" : "px-1 pt-1",
      )}>
        {!isRoot && (
          <FolderTree className={cn(
            "h-3.5 w-3.5 shrink-0",
            hasIssue || hasDescendantIssue ? "text-error" : "text-foreground-muted",
          )} />
        )}
        <button
          type="button"
          onClick={() => onToggleOperator(group.id, group.operator === "and" ? "or" : "and")}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-caption-xs font-bold uppercase tracking-wider transition-colors cursor-pointer",
            group.operator === "and"
              ? "bg-brand/10 text-brand hover:bg-brand/20"
              : "bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20",
          )}
          data-testid={`rule-group-operator-${group.id}`}
        >
          {group.operator === "and" ? "All (AND)" : "Any (OR)"}
        </button>
        {!isRoot && (
          <button
            type="button"
            onClick={() => onSelectNode(group.id)}
            className="ml-auto rounded p-1 text-foreground-muted hover:bg-subtle hover:text-foreground transition-colors cursor-pointer"
            aria-label="Select group"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Children */}
      <div className="space-y-0.5">
        {group.children.map((node, idx) => {
          if (isRuleGroup(node)) {
            return (
              <React.Fragment key={node.id}>
                {idx > 0 && (
                  <div className="flex items-center justify-center py-0.5">
                    <span className={cn(
                      "text-caption-xs font-medium uppercase tracking-wider",
                      group.operator === "and" ? "text-brand/50" : "text-accent-violet/50",
                    )}>
                      {group.operator}
                    </span>
                  </div>
                )}
                <RuleGroupNode
                  group={node}
                  depth={depth + 1}
                  selectedRuleId={selectedRuleId}
                  onSelectNode={onSelectNode}
                  onAddRule={onAddRule}
                  onAddGroup={onAddGroup}
                  onDeleteGroup={onDeleteGroup}
                  onToggleOperator={onToggleOperator}
                  ruleIssues={ruleIssues}
                  resolveFieldLabel={resolveFieldLabel}
                  pristineRuleIds={pristineRuleIds}
                />
              </React.Fragment>
            );
          }

          // Leaf rule
          const rule = node;
          const isActive = rule.id === selectedRuleId;
          const issue = ruleIssues.get(rule.id);

          return (
            <React.Fragment key={rule.id}>
              {idx > 0 && (
                <div className="flex items-center justify-center py-0.5">
                  <span className={cn(
                    "text-caption-xs font-medium uppercase tracking-wider",
                    group.operator === "and" ? "text-brand/50" : "text-accent-violet/50",
                  )}>
                    {group.operator}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelectNode(rule.id)}
                data-testid={`rule-item-${rule.id}`}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg p-3 text-left transition-all cursor-pointer",
                  "border-l-4",
                  issue
                    ? isActive ? "bg-error/5 border-error" : "border-error/50 hover:bg-subtle group"
                    : isActive
                      ? "bg-brand/5 border-brand"
                      : "border-transparent hover:bg-subtle group",
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "text-caption-xs font-bold uppercase tracking-wider mb-0.5",
                    issue ? "text-error" : isActive ? "text-brand" : "text-foreground-muted",
                  )}>
                    {VALIDATION_RULE_TYPE_OPTIONS.find((o) => o.value === rule.type)?.label ?? rule.type}
                  </span>
                  <span className={cn(
                    "text-label font-medium truncate",
                    issue ? "text-error/80" : isActive ? "text-foreground" : "text-foreground-muted",
                  )}>
                    {Array.isArray(rule.field)
                      ? rule.field.length > 0
                        ? rule.field.length <= 2
                          ? rule.field.map(resolveFieldLabel).join(", ")
                          : `${rule.field.slice(0, 2).map(resolveFieldLabel).join(", ")} +${rule.field.length - 2}`
                        : "No fields selected"
                      : rule.field ? resolveFieldLabel(rule.field) : "No field selected"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {issue && <AlertCircle className="h-3.5 w-3.5 text-error" />}
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-foreground-muted" : "text-transparent group-hover:text-foreground-muted",
                  )} />
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Add buttons at bottom of group */}
      <div className={cn("flex items-center gap-1.5 mt-2", isRoot ? "px-1" : "px-1 pb-1")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddRule(group.id)}
          className="text-caption-xs h-7 cursor-pointer"
          data-testid={`rule-group-add-rule-${group.id}`}
        >
          <Plus className="mr-1 h-3 w-3" />
          Rule
        </Button>
        {depth < 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddGroup(group.id)}
            className="text-caption-xs h-7 cursor-pointer"
            data-testid={`rule-group-add-group-${group.id}`}
          >
            <FolderTree className="mr-1 h-3 w-3" />
            Group
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Replace the flat sidebar rule list**

Replace the validation tab sidebar content (lines 2214-2283) with:

```tsx
{/* Left sidebar — rule tree */}
<aside className="w-[var(--width-popover-sm)] shrink-0 border-r border-border flex flex-col">
  <div className="flex items-center justify-between p-4 pb-3">
    <h3 className="text-body font-medium text-foreground">Rules</h3>
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => handleAddGroup(null)} data-testid="rule-add-group">
        <FolderTree className="mr-1 h-3.5 w-3.5" />
        Group
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleAddRule(null)} data-testid="rule-add">
        <Plus className="mr-1 h-3.5 w-3.5" />
        Rule
      </Button>
    </div>
  </div>
  <div className="flex-1 overflow-y-auto px-2 pb-2">
    {validationRules.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <ShieldCheck className="h-8 w-8 text-foreground-muted mb-2" />
        <p className="text-label text-foreground-muted">No rules defined</p>
      </div>
    ) : (
      <RuleGroupNode
        group={{ id: "__root__", operator: "and", children: validationRules }}
        depth={0}
        selectedRuleId={selectedRuleId}
        onSelectNode={setSelectedRuleId}
        onAddRule={handleAddRule}
        onAddGroup={handleAddGroup}
        onDeleteGroup={handleDeleteGroup}
        onToggleOperator={updateGroupOperator}
        ruleIssues={ruleIssues}
        resolveFieldLabel={resolveFieldLabel}
        pristineRuleIds={pristineRuleIds}
      />
    )}
  </div>
</aside>
```

Note: The `__root__` pseudo-group wraps root-level nodes for rendering. The `handleAddRule(null)` and `handleAddGroup(null)` calls use `null` to insert at the root level. The root operator toggle changes the implicit top-level behavior — we need to handle this:

Add a `rootOperator` state and wire it:

```typescript
const [rootOperator, setRootOperator] = React.useState<"and" | "or">("and");
```

Actually, simpler approach: always wrap the root in a real `ValidationRuleGroup`. On load, if the stored data is a flat array, wrap it. On save, store the group structure as-is.

**Revised approach for root group**: Instead of a pseudo-group, update the state to always be a single root `ValidationRuleGroup`:

Change the state (this replaces the earlier `validationRules` state):

```typescript
const [ruleTree, setRuleTree] = React.useState<ValidationRuleGroup>({
  id: "__root__",
  operator: "and",
  children: [],
});
```

Then everywhere that previously referenced `validationRules`, use `ruleTree.children` for the children and `ruleTree` for passing to RuleGroupNode. The save payload uses `ruleTree.children` as the serialized `validationRules` field. The load code wraps flat arrays:

```typescript
// In the init effect, when loading config.validationRules:
const loaded = config.validationRules;
// Check if already a root group structure
const hasGroups = loaded.some((n) => isRuleGroup(n));
setRuleTree({
  id: "__root__",
  operator: "and",
  children: loaded,
});
```

For dirty tracking, use `ruleTree` instead of `validationRules` in the snapshot.

**Step 4: Add group detail panel**

In the right panel (after the existing rule detail form, lines 2300-2494), add a group detail panel that shows when a group is selected instead of a rule:

```tsx
{selectedGroup && !selectedRule ? (
  <>
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        <h3 className="text-body font-medium text-foreground">Group Settings</h3>
        <p className="text-caption text-foreground-muted mt-0.5">Configure the logical operator for this group.</p>
      </div>
      <button
        onClick={() => handleDeleteGroup(selectedGroup.id)}
        className="rounded p-1.5 text-foreground-muted hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
        aria-label="Delete group"
        data-testid="rule-group-delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {ruleIssues.has(selectedGroup.id) && (
        <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-label text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {ruleIssues.get(selectedGroup.id)}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-label font-medium text-foreground">Operator</label>
        <Select
          value={selectedGroup.operator}
          onValueChange={(v) => updateGroupOperator(selectedGroup.id, v as "and" | "or")}
        >
          <SelectTrigger data-testid="rule-group-operator-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-caption text-foreground-muted">
          {selectedGroup.operator === "and"
            ? "All rules in this group must pass validation."
            : "At least one rule in this group must pass validation."}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-subtle/30 p-4">
        <p className="text-label text-foreground-muted">
          {selectedGroup.children.length === 0
            ? "This group is empty. Add rules or sub-groups using the buttons in the sidebar."
            : `Contains ${countLeafRules(selectedGroup.children)} rule${countLeafRules(selectedGroup.children) !== 1 ? "s" : ""}.`}
        </p>
      </div>
      <div className="pt-2">
        <p className="text-caption text-foreground-muted italic">
          Deleting this group will promote its children to the parent level.
        </p>
      </div>
    </div>
  </>
) : selectedRule ? (
  // ... existing rule detail form ...
) : (
  // ... existing empty state ...
)}
```

**Step 5: Run type check and fix any remaining issues**

Run: `npx tsc --noEmit 2>&1 | head -60`
Fix any type errors.

**Step 6: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git commit -m "feat: add recursive rule tree UI with AND/OR grouping"
```

---

### Task 5: Handle Root Group Serialization and Migration

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx`

This task ensures proper round-tripping: loading old flat arrays, editing, and saving the tree structure.

**Step 1: Update initialization to wrap flat arrays**

In the `React.useEffect` that initializes form state (lines 1140-1188), when setting validationRules from `config.validationRules` or from create state, wrap in a root group:

For create mode (line 1151):
```typescript
setRuleTree({ id: "__root__", operator: "and", children: [] });
```

For edit mode (line 1173):
```typescript
setRuleTree({ id: "__root__", operator: "and", children: config.validationRules });
```

**Step 2: Update `handleSave` to serialize tree**

In the `configToSave` object (line 1514), change:
```typescript
// Old:
validationRules,
// New:
validationRules: ruleTree.children,
```

**Step 3: Update dirty tracking snapshot**

In the initial snapshot and save snapshot, use `ruleTree` instead of `validationRules`.

**Step 4: Update `handleSave` validation error navigation**

The code at lines 1493-1495 that selects the first bad rule ID needs to check `ruleIssues` which now includes group IDs too. Only select leaf rules:

```typescript
if (firstErroredTab?.[0] === "validation" && ruleIssues.size > 0) {
  // Select first problematic leaf rule (not group)
  const allRules = flattenRules(ruleTree.children);
  const firstBadRule = allRules.find((r) => ruleIssues.has(r.id));
  if (firstBadRule) setSelectedRuleId(firstBadRule.id);
}
```

**Step 5: Verify round-trip works**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/features/programs/pages/activity-template-edit-page.tsx
git commit -m "feat: handle root group serialization and migration for rule tree"
```

---

### Task 6: Manual Testing and Polish

**Files:**
- Modify: `src/features/programs/pages/activity-template-edit-page.tsx` (if fixes needed)

**Step 1: Start the dev server and test**

Run: `docker compose -f docker-compose.dev.yml up -d`

Test checklist:
1. Open an existing activity template — flat rules should display correctly (auto-wrapped)
2. Add a new rule at root level — should appear and be editable
3. Add a group at root level — should show nested card with AND operator
4. Toggle operator on a group — should switch between AND/OR
5. Add rules inside a group — should nest correctly
6. Add a nested group inside a group — should work up to depth 3
7. Try adding a group at depth 3 — "Group" button should be hidden
8. Delete a group — children should promote to parent
9. Delete a rule inside a group — should remove correctly
10. Save and reload — tree structure should persist
11. Empty group should show warning

**Step 2: Fix any visual/functional issues found**

**Step 3: Run lint and type check**

Run: `npm run lint && npx tsc --noEmit`

**Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: polish validation rule grouping UI"
```

---

### Task 7: Update Tests

**Files:**
- Modify: any existing test files that reference `validationRules` on `ActivityTemplateConfig`

**Step 1: Search for existing tests that reference validation rules**

Run: `grep -rl "validationRules" src/ --include="*.test.*"`

**Step 2: Update any affected tests to use the new tree structure**

If tests create `ActivityTemplateConfig` objects with flat `validationRules` arrays, they should still work since `ValidationRuleNode[]` accepts `ValidationRuleDef[]`. Only update if type errors occur.

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -u
git commit -m "test: update tests for validation rule grouping"
```
