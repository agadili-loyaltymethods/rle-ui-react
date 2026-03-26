/**
 * Expression utilities for calculated fields.
 * Supports basic math: +, -, *, /, parentheses, numeric literals, and field references.
 */

/** Token types in a calc expression. */
type TokenType = "field" | "number" | "operator" | "paren";

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = new Set(["+", "-", "*", "/"]);
const PARENS = new Set(["(", ")"]);
const FIELD_RE = /^[a-zA-Z_]\w*(\.\w+)*/;
const NUMBER_RE = /^\d+(\.\d+)?/;

/**
 * Tokenize a calc expression into tokens.
 * Throws on invalid characters.
 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (OPERATORS.has(ch)) { tokens.push({ type: "operator", value: ch }); i++; continue; }
    if (PARENS.has(ch)) { tokens.push({ type: "paren", value: ch }); i++; continue; }
    const numMatch = expr.slice(i).match(NUMBER_RE);
    if (numMatch) { tokens.push({ type: "number", value: numMatch[0] }); i += numMatch[0].length; continue; }
    const fieldMatch = expr.slice(i).match(FIELD_RE);
    if (fieldMatch) { tokens.push({ type: "field", value: fieldMatch[0] }); i += fieldMatch[0].length; continue; }
    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }
  return tokens;
}

/**
 * Extract field references from a calc expression.
 * Returns unique field names referenced in the expression.
 */
export function extractFieldRefs(expression: string): string[] {
  if (!expression.trim()) return [];
  const tokens = tokenize(expression);
  const fields = tokens.filter((t) => t.type === "field").map((t) => t.value);
  return [...new Set(fields)];
}

/**
 * Validate expression syntax. Returns null if valid, error message if invalid.
 */
export function validateExpression(expression: string): string | null {
  if (!expression.trim()) return "Expression is required";
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return "Expression is empty";
    // Check balanced parentheses
    let depth = 0;
    for (const t of tokens) {
      if (t.value === "(") depth++;
      if (t.value === ")") depth--;
      if (depth < 0) return "Unmatched closing parenthesis";
    }
    if (depth !== 0) return "Unmatched opening parenthesis";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid expression";
  }
}

/**
 * Compute dependencies of a calculated field on other calculated fields.
 * @param fieldRefs - field references extracted from the expression
 * @param calcFieldNames - set of all calculated field names in the template
 * @returns names of calculated fields this expression depends on
 */
export function computeDependencies(
  fieldRefs: string[],
  calcFieldNames: Set<string>,
): string[] {
  return fieldRefs.filter((ref) => calcFieldNames.has(ref));
}

/**
 * Topological sort of calculated fields by dependency order.
 * Returns sorted array or throws if circular dependency detected.
 */
export function topologicalSort(
  fields: { name: string; expression: string }[],
): string[] {
  const names = new Set(fields.map((f) => f.name));
  const deps = new Map<string, string[]>();
  for (const f of fields) {
    const refs = extractFieldRefs(f.expression);
    deps.set(f.name, computeDependencies(refs, names));
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected involving '${name}'`);
    }
    visiting.add(name);
    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const f of fields) visit(f.name);
  return sorted;
}

/**
 * Sort calculated fields array by dependency order.
 * Returns a new sorted array.
 */
export function sortByDependencies<T extends { name: string; expression: string }>(
  fields: T[],
): T[] {
  const order = topologicalSort(fields);
  const byName = new Map(fields.map((f) => [f.name, f]));
  return order.map((name) => byName.get(name)!);
}

/**
 * Format an expression for human-readable display.
 * Replaces field references with their labels when available.
 */
export function formatExpression(
  expression: string,
  fieldLabels: Record<string, string>,
): string {
  if (!expression.trim()) return "";
  try {
    const tokens = tokenize(expression);
    return tokens
      .map((t) => {
        if (t.type === "field") return fieldLabels[t.value] ?? t.value;
        return t.value;
      })
      .join(" ");
  } catch {
    return expression;
  }
}
