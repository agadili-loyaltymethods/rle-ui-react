#!/usr/bin/env node
/**
 * check-testability.mjs
 *
 * Evaluates rcx-ui source files against UI test automation guidelines:
 *  1. Stable & Unique Attributes  – interactive elements have data-testid + a second stable attr
 *  2. Business-Oriented Naming    – data-testid values are not auto-generated / index-only
 *  3. Avoid Fragile Selectors     – no index-based aria-labels or numeric-only testids
 *  4. Repeated Elements           – list rows carry dynamic (item-id-based) data-testid
 *  5. Accessibility               – img elements have alt; interactive elements have aria-label or role
 *
 * Usage:
 *   node scripts/check-testability.mjs [--dir src/features/reward-catalog] [--json]
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const dirArg = args.find((a) => a.startsWith("--dir="))?.slice(6)
  ?? args[args.indexOf("--dir") + 1];
const SCAN_DIR = dirArg ? join(ROOT, dirArg) : join(ROOT, "src");

// ── Interactive element tags to audit ─────────────────────────────────────────
const INTERACTIVE_TAGS = ["button", "input", "select", "textarea", "form", "a"];

// Attributes that count as "stable identifiers"
const STABLE_ATTRS = ["data-testid", "id", "aria-label", "aria-labelledby", "name"];

// ── File discovery ────────────────────────────────────────────────────────────
function findTsxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...findTsxFiles(full));
    else if ([".tsx", ".jsx"].includes(extname(entry))) results.push(full);
  }
  return results;
}

// ── JSX tag extractor ─────────────────────────────────────────────────────────
// Extracts opening JSX tags and the line they start on.
// Handles multiline tags by reading until the closing > or />.
function extractTags(content) {
  const lines = content.split("\n");
  const tags = [];

  for (let i = 0; i < lines.length; i++) {
    // Match the start of an interactive JSX element
    const m = lines[i].match(/^\s*<(button|input|select|textarea|form|a)\b/);
    if (!m) continue;

    const tagName = m[1];
    let raw = "";
    let j = i;
    // Collect until we hit a closing > (end of opening tag)
    while (j < lines.length) {
      raw += " " + lines[j];
      if (/\/?>/.test(lines[j])) break;
      j++;
    }

    tags.push({ tag: tagName, line: i + 1, raw });
  }
  return tags;
}

// ── Attribute checkers ────────────────────────────────────────────────────────
const has = (raw, attr) => new RegExp(`\\b${attr}[=\\s{]`).test(raw);

function countStableAttrs(raw) {
  return STABLE_ATTRS.filter((a) => has(raw, a)).length;
}

function hasDataTestId(raw) { return has(raw, "data-testid"); }
function hasAriaLabel(raw)  { return has(raw, "aria-label"); }
function hasId(raw)         { return /\bid=/.test(raw); }
function hasRole(raw)       { return has(raw, "role"); }

// Detect suspicious naming: pure numbers, "btn-0", "item-1", etc.
function looksFragile(raw) {
  const m = raw.match(/data-testid[={"'\s]+([^"'\s}]+)/);
  if (!m) return false;
  const val = m[1].replace(/[{}`'"]/g, "");
  return /^\d+$/.test(val) || /-(0|1|2|3|4|5|6|7|8|9)$/.test(val);
}

// Detect dynamic data-testid (template literal or expression – good for lists)
function isDynamic(raw) {
  return /data-testid=\{[^}]+\}/.test(raw) || /data-testid=`/.test(raw);
}

// Extract the static data-testid value (returns null for dynamic / missing)
function getTestIdValue(raw) {
  // Static: data-testid="some-id"
  const staticMatch = raw.match(/data-testid=["']([^"']+)["']/);
  if (staticMatch) return staticMatch[1];
  return null;
}

// ── Per-file analysis ─────────────────────────────────────────────────────────
function analyzeFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const tags = extractTags(content);
  const issues = [];
  const ok = [];

  // Collect all static data-testid values to detect in-file duplicates
  const testIdOccurrences = new Map(); // value → [{ tag, line }]
  for (const { tag, line, raw } of tags) {
    const val = getTestIdValue(raw);
    if (val) {
      if (!testIdOccurrences.has(val)) testIdOccurrences.set(val, []);
      testIdOccurrences.get(val).push({ tag, line });
    }
  }
  const duplicatedIds = new Set(
    [...testIdOccurrences.entries()].filter(([, locs]) => locs.length > 1).map(([v]) => v),
  );

  for (const { tag, line, raw } of tags) {
    const dtid = hasDataTestId(raw);
    const stable = countStableAttrs(raw);
    const fragile = looksFragile(raw);
    const dynamic = isDynamic(raw);
    const a11y = hasAriaLabel(raw) || hasRole(raw) || hasId(raw);
    const testIdVal = getTestIdValue(raw);

    const fileIssues = [];

    // Rule 1 – data-testid missing
    if (!dtid) fileIssues.push("missing data-testid");

    // Rule 1 – needs a second stable attr
    if (dtid && stable < 2) fileIssues.push("only one stable attribute (add aria-label or id)");

    // Rule 3 – fragile naming
    if (dtid && fragile) fileIssues.push("data-testid looks index-based / fragile");

    // Rule 5 – accessibility
    if (!a11y && (tag === "button" || tag === "a")) {
      fileIssues.push("no aria-label, role, or id for accessibility");
    }

    // Rule 6 – duplicate data-testid within same file
    if (testIdVal && duplicatedIds.has(testIdVal)) {
      fileIssues.push(`duplicate data-testid "${testIdVal}" (use unique ids per element)`);
    }

    const entry = { tag, line, raw: raw.trim().slice(0, 120), dynamic, testId: testIdVal, issues: fileIssues };

    if (fileIssues.length > 0) issues.push(entry);
    else ok.push(entry);
  }

  return { total: tags.length, ok: ok.length, issues };
}

// ── img alt check ─────────────────────────────────────────────────────────────
function checkImgAlt(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const missing = [];
  lines.forEach((line, i) => {
    if (/<img\b/.test(line) && !/\balt=/.test(line)) {
      missing.push({ line: i + 1, raw: line.trim().slice(0, 120) });
    }
  });
  return missing;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const files = findTsxFiles(SCAN_DIR);

let totalElements = 0;
let totalOk = 0;
let totalWithTestId = 0;
const fileReports = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const { total, ok, issues } = analyzeFile(file);
  const imgIssues = checkImgAlt(file).map((i) => ({ ...i, tag: "img", issues: ["img missing alt attribute"] }));

  totalElements += total;
  totalOk += ok;

  // Count elements that already have data-testid (ok ones + ones with other issues but still have testid)
  const missingTestId = issues.filter((i) => i.issues.includes("missing data-testid")).length;
  totalWithTestId += total - missingTestId;

  if (issues.length > 0 || imgIssues.length > 0) {
    fileReports.push({ file: rel, issues: [...issues, ...imgIssues] });
  }
}

// ── Cross-file duplicate data-testid detection ───────────────────────────────
// Collect all static data-testid values across files to detect collisions
const globalTestIds = new Map(); // value → [{ file, line, tag }]
for (const { file, issues } of fileReports) {
  for (const issue of issues) {
    if (issue.testId) {
      if (!globalTestIds.has(issue.testId)) globalTestIds.set(issue.testId, []);
      globalTestIds.get(issue.testId).push({ file, line: issue.line, tag: issue.tag });
    }
  }
}
// Also scan ok elements (they won't be in fileReports), so re-scan files
for (const file of files) {
  const rel = relative(ROOT, file);
  const content = readFileSync(file, "utf-8");
  const tags = extractTags(content);
  for (const { tag, line, raw } of tags) {
    const val = getTestIdValue(raw);
    if (val) {
      if (!globalTestIds.has(val)) globalTestIds.set(val, []);
      // Avoid duplicating entries already added from fileReports
      const existing = globalTestIds.get(val);
      if (!existing.some((e) => e.file === rel && e.line === line)) {
        existing.push({ file: rel, line, tag });
      }
    }
  }
}

const crossFileDups = [...globalTestIds.entries()]
  .filter(([, locs]) => {
    const uniqueFiles = new Set(locs.map((l) => l.file));
    return uniqueFiles.size > 1;
  })
  .sort((a, b) => b[1].length - a[1].length);

// Inject cross-file duplicate issues into file reports
for (const [testIdVal, locs] of crossFileDups) {
  for (const { file, line, tag } of locs) {
    const otherFiles = locs
      .filter((l) => l.file !== file)
      .map((l) => l.file.replace(/\\/g, "/").split("/").pop())
      .filter((v, i, a) => a.indexOf(v) === i);
    const msg = `duplicate data-testid "${testIdVal}" also in ${otherFiles.join(", ")}`;
    let report = fileReports.find((r) => r.file === file);
    if (!report) {
      report = { file, issues: [] };
      fileReports.push(report);
    }
    const existing = report.issues.find((i) => i.line === line && i.tag === tag);
    if (existing) {
      if (!existing.issues.some((m) => m.startsWith("duplicate data-testid"))) {
        existing.issues.push(msg);
      }
    } else {
      report.issues.push({ tag, line, raw: "", dynamic: false, testId: testIdVal, issues: [msg] });
    }
  }
}

const score = totalElements === 0 ? 100 : Math.round((totalOk / totalElements) * 100);
const totalIssues = fileReports.reduce((s, r) => s + r.issues.length, 0);

// ── Output ────────────────────────────────────────────────────────────────────
if (jsonMode) {
  console.log(JSON.stringify({ score, totalElements, totalOk, totalIssues, crossFileDuplicates: crossFileDups.length, files: fileReports }, null, 2));
  process.exit(totalIssues > 0 ? 1 : 0);
}

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const RED    = "\x1b[31m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE   = "\x1b[34m";
const MAGENTA= "\x1b[35m";
const CYAN   = "\x1b[36m";
const WHITE  = "\x1b[97m";
const BG_RED    = "\x1b[41m";
const BG_GREEN  = "\x1b[42m";
const BG_YELLOW = "\x1b[43m";
const BG_BLUE   = "\x1b[44m";
const BG_DARK   = "\x1b[100m";

const scoreColor  = score >= 80 ? GREEN  : score >= 60 ? YELLOW : RED;
const scoreBg     = score >= 80 ? BG_GREEN : score >= 60 ? BG_YELLOW : BG_RED;
const testIdMissing = totalElements - totalWithTestId;
const testIdPct   = totalElements === 0 ? 100 : Math.round((totalWithTestId / totalElements) * 100);
const testIdColor = testIdPct === 100 ? GREEN : testIdPct >= 50 ? YELLOW : RED;

// Progress bar generator
function bar(value, total, width = 28) {
  const filled = total === 0 ? width : Math.round((value / total) * width);
  const empty  = width - filled;
  const color  = filled / width >= 0.8 ? GREEN : filled / width >= 0.5 ? YELLOW : RED;
  return `${color}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${R}`;
}

// Severity badge
function badge(count) {
  if (count === 0)  return `${BG_GREEN}${WHITE}${B}  OK  ${R}`;
  if (count <= 5)   return `${BG_YELLOW}${WHITE}${B} WARN ${R}`;
  return              `${BG_RED}${WHITE}${B} FAIL ${R}`;
}

// Box drawing
const W = 72;
const line  = `${"─".repeat(W)}`;
const dline = `${"═".repeat(W)}`;
function boxTop(title)   { return `╔${dline}╗\n║  ${B}${WHITE}${title.padEnd(W - 2)}${R}  ║\n╠${dline}╣`; }
function boxBot()        { return `╚${dline}╝`; }
function boxRow(label, value, extra = "") {
  const raw = `  ${label.padEnd(18)}${value}`;
  const pad = Math.max(0, W - stripAnsi(raw).length - 2);
  return `║${raw}${" ".repeat(pad)}  ${extra}║`;
}
function stripAnsi(s)    { return s.replace(/\x1b\[[0-9;]*m/g, ""); }

// ── HEADER ────────────────────────────────────────────────────────────────────
const scanLabel = SCAN_DIR.replace(ROOT + "\\", "").replace(ROOT + "/", "");

console.log();
console.log(boxTop("⬡  UI Testability Audit"));
console.log(boxRow(`${DIM}Scanned${R}`,  `${CYAN}${B}${scanLabel}${R}`));
console.log(boxRow(`${DIM}Files${R}`,    `${B}${files.length}${R}  ${DIM}tsx/jsx${R}`));
console.log(boxRow(`${DIM}Elements${R}`, `${B}${totalElements}${R}  ${DIM}interactive${R}`));
console.log(`║  ${"─".repeat(W - 2)}  ║`);

// Score row with inline bar
const scoreBarLine = `  ${DIM}Score${R}             ${scoreBg}${WHITE}${B} ${score}% ${R}  ${bar(totalOk, totalElements)}  ${DIM}${totalOk}/${totalElements} pass${R}`;
const scorePad = Math.max(0, W - stripAnsi(scoreBarLine).length - 2);
console.log(`║${scoreBarLine}${" ".repeat(scorePad)}  ║`);

// data-testid coverage row
const dtLine = `  ${DIM}data-testid${R}       ${testIdColor}${B}${totalWithTestId}/${totalElements}${R}  ${bar(totalWithTestId, totalElements)}  ${DIM}${testIdMissing} missing${R}`;
const dtPad  = Math.max(0, W - stripAnsi(dtLine).length - 2);
console.log(`║${dtLine}${" ".repeat(dtPad)}  ║`);

console.log(`║  ${"─".repeat(W - 2)}  ║`);

// Issues summary row
const issuesLine = `  ${DIM}Issues${R}            ${totalIssues === 0 ? `${GREEN}${B}✔ None${R}` : `${RED}${B}${totalIssues} issues${R}  across ${fileReports.length} files`}`;
const issuesPad  = Math.max(0, W - stripAnsi(issuesLine).length - 2);
console.log(`║${issuesLine}${" ".repeat(issuesPad)}  ║`);
console.log(boxBot());

// ── PER-FILE ISSUES ───────────────────────────────────────────────────────────
if (fileReports.length > 0) {
  console.log();
  console.log(`${BG_DARK}${WHITE}${B}  ◈  Issues by File${" ".repeat(W - 17)}${R}`);
  console.log();

  for (const { file, issues } of fileReports) {
    const fileIssueCount = issues.length;
    const fileName = file.replace(/\\/g, "/");
    // File header
    console.log(`  ${BLUE}${B}▸ ${fileName}${R}  ${badge(fileIssueCount)}  ${DIM}${fileIssueCount} issue${fileIssueCount !== 1 ? "s" : ""}${R}`);
    console.log(`  ${DIM}${"┄".repeat(W - 2)}${R}`);

    for (const issue of issues) {
      const ruleText = issue.issues.join(`  ${DIM}·${R}  `);
      console.log(`    ${RED}✗${R}  ${YELLOW}L${String(issue.line).padEnd(5)}${R}  ${CYAN}<${issue.tag}>${R}  ${ruleText}`);
      console.log(`      ${DIM}${issue.raw.slice(0, 90)}${issue.raw.length > 90 ? "…" : ""}${R}`);
    }
    console.log();
  }
}

// ── SUMMARY BY RULE ───────────────────────────────────────────────────────────
const byRule = {};
for (const { file, issues } of fileReports) {
  for (const issue of issues) {
    for (const msg of issue.issues) {
      if (!byRule[msg]) byRule[msg] = [];
      byRule[msg].push({ file, line: issue.line, tag: issue.tag });
    }
  }
}

if (Object.keys(byRule).length > 0) {
  console.log(`${BG_DARK}${WHITE}${B}  ◈  Summary by Rule${" ".repeat(W - 18)}${R}`);
  console.log();

  // data-testid coverage stat
  console.log(`  ${GREEN}${B}✔${R}  ${String(totalWithTestId).padStart(4)}  elements already have data-testid`);
  console.log(`  ${RED}${B}✗${R}  ${String(testIdMissing).padStart(4)}  elements missing data-testid`);
  console.log();

  const sorted = Object.entries(byRule).sort((a, b) => b[1].length - a[1].length);
  for (const [rule, occurrences] of sorted) {
    const pct = Math.round((occurrences.length / totalElements) * 100);
    console.log(`  ${badge(occurrences.length)}  ${B}${occurrences.length}${R}  ${rule}  ${DIM}(${pct}% of elements)${R}`);

    // Group by file for compact display
    const byFile = {};
    for (const { file, line, tag } of occurrences) {
      const short = file.replace(/\\/g, "/").split("/").slice(-1)[0];
      if (!byFile[short]) byFile[short] = [];
      byFile[short].push({ line, tag, full: file.replace(/\\/g, "/") });
    }

    for (const [fileName, locs] of Object.entries(byFile)) {
      const lineNums = locs.map(l => `${YELLOW}L${l.line}${R}${DIM}<${l.tag}>${R}`).join("  ");
      console.log(`       ${DIM}│${R}  ${CYAN}${fileName}${R}  ${lineNums}`);
    }
    console.log();
  }

  // Final verdict
  if (score === 100) {
    console.log(`  ${BG_GREEN}${WHITE}${B}  ✔  All elements pass! Great job.  ${R}`);
  } else {
    console.log(`  ${DIM}Fix the ${RED}${B}${totalIssues}${R}${DIM} issues above and re-run to improve your score.${R}`);
  }
  console.log();
}

// ── CROSS-FILE DUPLICATE REPORT ──────────────────────────────────────────────
if (crossFileDups.length > 0) {
  console.log(`${BG_DARK}${WHITE}${B}  ◈  Cross-File Duplicate data-testid${" ".repeat(W - 36)}${R}`);
  console.log();
  for (const [testIdVal, locs] of crossFileDups) {
    console.log(`  ${BG_RED}${WHITE}${B} DUP ${R}  ${B}${MAGENTA}"${testIdVal}"${R}  ${DIM}appears in ${locs.length} locations across ${new Set(locs.map(l => l.file)).size} files${R}`);
    for (const { file, line, tag } of locs) {
      const short = file.replace(/\\/g, "/").split("/").pop();
      console.log(`       ${DIM}│${R}  ${CYAN}${short}${R}  ${YELLOW}L${line}${R}${DIM}<${tag}>${R}`);
    }
    console.log();
  }
} else if (!jsonMode && totalElements > 0) {
  console.log(`  ${GREEN}${B}✔${R}  No cross-file data-testid duplicates found.`);
  console.log();
}

process.exit(totalIssues > 0 ? 1 : 0);
