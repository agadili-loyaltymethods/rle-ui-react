import { describe, it, expect } from "vitest";

describe("shared/ui barrel export", () => {
  it("re-exports all UI primitives", async () => {
    const mod = await import("./index");
    expect(mod.Button).toBeDefined();
    expect(mod.buttonVariants).toBeDefined();
    expect(mod.Input).toBeDefined();
    expect(mod.Badge).toBeDefined();
    expect(mod.badgeVariants).toBeDefined();
    expect(mod.Card).toBeDefined();
    expect(mod.CardHeader).toBeDefined();
    expect(mod.CardTitle).toBeDefined();
    expect(mod.CardDescription).toBeDefined();
    expect(mod.CardContent).toBeDefined();
    expect(mod.CardFooter).toBeDefined();
    expect(mod.Skeleton).toBeDefined();
    expect(mod.Checkbox).toBeDefined();
    expect(mod.Select).toBeDefined();
    expect(mod.SelectTrigger).toBeDefined();
    expect(mod.SelectContent).toBeDefined();
    expect(mod.SelectItem).toBeDefined();
    expect(mod.SelectValue).toBeDefined();
    expect(mod.SelectGroup).toBeDefined();
    expect(mod.SelectLabel).toBeDefined();
    expect(mod.SelectSeparator).toBeDefined();
  });
});
