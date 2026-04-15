#!/usr/bin/env node

/**
 * Strict markdown -> JSON suppression parser with toggle.
 *
 * Usage:
 * - Strict (default): node scripts/agent/parse-suppressions-md.js
 * - Permissive:       node scripts/agent/parse-suppressions-md.js --strict=false
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const BASE = path.join(ROOT, "docs/agent-stack");
const STRICT = process.argv.includes("--strict=false") ? false : true;

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

function problem(message) {
  if (STRICT) throw new Error(message);
  console.warn(`WARN: ${message}`);
}

function parseMarkdownSuppressionFile(content, expectedPrefix, defaultType, filename) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let current = null;
  let inHtmlCommentBlock = false;

  function finalizeCurrent() {
    if (!current) return;
    if (!current.id) {
      problem(`${filename}: entry missing id`);
      if (STRICT) return;
    }
    if (!current.type) current.type = defaultType;
    entries.push(current);
    current = null;
  }

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith("<!--")) {
      inHtmlCommentBlock = true;
      return;
    }
    if (inHtmlCommentBlock) {
      if (trimmed.endsWith("-->")) inHtmlCommentBlock = false;
      return;
    }
    if (!trimmed) return;

    const h2 = trimmed.match(/^##\s+([A-Z]+-\d{4})\b(?:\s*-\s*(.+))?$/);
    if (h2) {
      finalizeCurrent();
      const id = h2[1];
      const title = h2[2] ? h2[2].trim() : "";
      if (!id.startsWith(expectedPrefix)) {
        problem(`${filename}:${lineNo} id '${id}' must start with '${expectedPrefix}'`);
      }
      current = { id, type: defaultType };
      if (title) current.title = title;
      return;
    }

    const kv = line.match(/^\s*-\s+([^:]+):\s*(.*)$/);

    if (kv && !current) {
      problem(`${filename}:${lineNo} key/value found before entry heading`);
      return;
    }

    if (current && trimmed.startsWith("-")) {
      if (!kv) {
        problem(`${filename}:${lineNo} malformed key/value line '${trimmed}'`);
        return;
      }

      const key = normalizeKey(kv[1]);
      if (!ALLOWED_KEYS.has(key)) {
        problem(`${filename}:${lineNo} unknown key '${key}'`);
        if (STRICT) return;
      }

      if (Object.prototype.hasOwnProperty.call(current, key)) {
        problem(`${filename}:${lineNo} duplicate key '${key}' in ${current.id}`);
        return;
      }

      // permissive mode keeps unknown keys too
      current[key] = parseValue(kv[2] || "");
      return;
    }

    if (current) {
      problem(`${filename}:${lineNo} unexpected content inside ${current.id}: '${trimmed}'`);
    }
  });

  finalizeCurrent();
  return entries;
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
      console.log(`Wrote ${path.relative(ROOT, spec.json)} (${entries.length} entries)`);
    } catch (err) {
      hadError = true;
      console.error(`ERROR: ${err.message}`);
    }
  }

  if (hadError) process.exit(1);
}

main();