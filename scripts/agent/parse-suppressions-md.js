#!/usr/bin/env node

/**
 * Strict markdown -> JSON suppression parser.
 *
 * Strict mode behavior:
 * - Fails on unknown keys
 * - Fails on duplicate keys within an entry
 * - Fails on malformed key/value lines
 * - Fails if ID prefix doesn't match file type
 *
 * Input:
 * - docs/agent-stack/security-suppressions.md
 * - docs/agent-stack/review-suppressions.md
 * - docs/agent-stack/ui-suppressions.md
 *
 * Output:
 * - docs/agent-stack/security-suppressions.json
 * - docs/agent-stack/review-suppressions.json
 * - docs/agent-stack/ui-suppressions.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const BASE = path.join(ROOT, "docs/agent-stack");

const FILE_MAP = [
  {
    md: path.join(BASE, "security-suppressions.md"),
    json: path.join(BASE, "security-suppressions.json"),
    defaultType: "security",
    idPrefix: "SEC-",
  },
  {
    md: path.join(BASE, "review-suppressions.md"),
    json: path.join(BASE, "review-suppressions.json"),
    defaultType: "review",
    idPrefix: "REV-",
  },
  {
    md: path.join(BASE, "ui-suppressions.md"),
    json: path.join(BASE, "ui-suppressions.json"),
    defaultType: "ui",
    idPrefix: "UI-",
  },
];

// Allowed normalized keys across all suppression files
const ALLOWED_KEYS = new Set([
  "status",
  "type",
  "tool",
  "lane",
  "category",
  "severity",
  "rule_id",
  "scope",
  "introduced_on",
  "expiry",
  "owner",
  "approver",
  "justification",
  "rationale",
  "remediation_plan",
  "removal_plan",
  "safe_guardrails",
  "issue_link",
  "last_reviewed",
  "impacted_flows",
  "user_risk",
  "mitigation",
  "verification_after_fix",
]);

function parseValue(raw) {
  const v = raw.trim();
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function normalizeKey(k) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function fail(message) {
  throw new Error(message);
}

function parseMarkdownSuppressionFile(content, expectedPrefix, defaultType, filename) {
  const lines = content.split(/\r?\n/);

  const entries = [];
  let current = null;
  let currentLine = -1;
  let inHtmlCommentBlock = false;

  function finalizeCurrent() {
    if (!current) return;

    if (!current.id) {
      fail(`${filename}:${currentLine} entry missing id`);
    }

    // Default type if missing
    if (!current.type) current.type = defaultType;

    entries.push(current);
    current = null;
    currentLine = -1;
  }

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();

    // Ignore HTML comment template blocks
    if (trimmed.startsWith("<!--")) {
      inHtmlCommentBlock = true;
      return;
    }
    if (inHtmlCommentBlock) {
      if (trimmed.endsWith("-->")) inHtmlCommentBlock = false;
      return;
    }

    // Skip blanks
    if (!trimmed) return;

    // Start of suppression block: "## SEC-0001 - Title"
    const h2 = trimmed.match(/^##\s+([A-Z]+-\d{4})\b(?:\s*-\s*(.+))?$/);
    if (h2) {
      finalizeCurrent();

      const id = h2[1];
      const title = h2[2] ? h2[2].trim() : "";

      if (!id.startsWith(expectedPrefix)) {
        fail(
          `${filename}:${lineNo} id '${id}' must start with '${expectedPrefix}'`
        );
      }

      current = { id, type: defaultType };
      currentLine = lineNo;
      if (title) current.title = title;
      return;
    }

    // For strictness: if we see "- key: value" outside an entry, fail.
    const kv = line.match(/^\s*-\s+([^:]+):\s*(.*)$/);
    if (kv && !current) {
      fail(`${filename}:${lineNo} key/value found before entry heading`);
    }

    // If in an entry, enforce key/value format for bullet lines
    if (current && trimmed.startsWith("-")) {
      if (!kv) {
        fail(`${filename}:${lineNo} malformed key/value line '${trimmed}'`);
      }

      const key = normalizeKey(kv[1]);
      if (!ALLOWED_KEYS.has(key)) {
        fail(`${filename}:${lineNo} unknown key '${key}'`);
      }

      if (Object.prototype.hasOwnProperty.call(current, key)) {
        fail(`${filename}:${lineNo} duplicate key '${key}' in ${current.id}`);
      }

      current[key] = parseValue(kv[2] || "");
      return;
    }

    // Ignore normal markdown text outside entries (headers/rules text)
    // But disallow non-comment text inside an active entry to avoid ambiguity.
    if (current) {
      fail(
        `${filename}:${lineNo} unexpected content inside ${current.id}: '${trimmed}'`
      );
    }
  });

  finalizeCurrent();

  // Remove explicit placeholder examples if desired (strict but practical)
  return entries.filter((e) => {
    const status = String(e.status || "").toLowerCase();
    const title = String(e.title || "").toLowerCase();
    const rationale = String(e.rationale || "").toLowerCase();
    const justification = String(e.justification || "").toLowerCase();

    const looksLikePlaceholder =
      title.includes("example placeholder") ||
      rationale.includes("placeholder only") ||
      justification.includes("placeholder only");

    if (status === "removed" && looksLikePlaceholder) return false;
    return true;
  });
}

function main() {
  let hadError = false;

  for (const spec of FILE_MAP) {
    if (!fs.existsSync(spec.md)) {
      console.warn(`WARN: Missing markdown file, skipping: ${spec.md}`);
      continue;
    }

    try {
      const md = fs.readFileSync(spec.md, "utf8");
      const entries = parseMarkdownSuppressionFile(
        md,
        spec.idPrefix,
        spec.defaultType,
        path.relative(ROOT, spec.md)
      );

      fs.writeFileSync(spec.json, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
      console.log(
        `Wrote ${path.relative(ROOT, spec.json)} (${entries.length} entries)`
      );
    } catch (err) {
      hadError = true;
      console.error(`ERROR: ${err.message}`);
    }
  }

  if (hadError) process.exit(1);
}

main();