#!/usr/bin/env node

/**
 * Converts markdown suppression files into JSON arrays for CI validation.
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

function parseValue(raw) {
  const v = raw.trim();
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function normalizeKey(k) {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseMarkdownSuppressionFile(content, expectedPrefix, defaultType) {
  const lines = content.split(/\r?\n/);

  const entries = [];
  let current = null;
  let inHtmlCommentBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Ignore HTML comment template blocks
    if (trimmed.startsWith("<!--")) {
      inHtmlCommentBlock = true;
      continue;
    }
    if (inHtmlCommentBlock) {
      if (trimmed.endsWith("-->")) inHtmlCommentBlock = false;
      continue;
    }

    // Start of suppression block: "## SEC-0001 - Title"
    const h2 = trimmed.match(/^##\s+([A-Z]+-\d{4})\b(?:\s*-\s*(.+))?$/);
    if (h2) {
      if (current && Object.keys(current).length > 0) entries.push(current);
      const id = h2[1];
      const title = h2[2] ? h2[2].trim() : "";

      current = { id };
      if (!id.startsWith(expectedPrefix)) {
        current.__parse_warning = `Unexpected id prefix for ${id}`;
      }
      if (title) current.title = title;
      if (!current.type) current.type = defaultType;
      continue;
    }

    // Key-value line: "- key: value"
    if (current) {
      const kv = line.match(/^\s*-\s+([^:]+):\s*(.*)$/);
      if (kv) {
        const key = normalizeKey(kv[1]);
        const value = parseValue(kv[2] || "");
        current[key] = value;
      }
    }
  }

  if (current && Object.keys(current).length > 0) entries.push(current);

  // Filter out placeholders commonly marked as removed + placeholder text
  return entries.filter((e) => {
    if (!e.id) return false;
    const status = String(e.status || "").toLowerCase();
    const title = String(e.title || "").toLowerCase();
    const rationale = String(e.rationale || "").toLowerCase();
    const justification = String(e.justification || "").toLowerCase();

    const looksLikePlaceholder =
      title.includes("example placeholder") ||
      rationale.includes("placeholder only") ||
      justification.includes("placeholder only");

    // Keep removed entries if they look real; drop obvious template placeholders
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
        spec.defaultType
      );

      fs.writeFileSync(spec.json, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
      console.log(
        `Wrote ${path.relative(ROOT, spec.json)} (${entries.length} entries)`
      );
    } catch (err) {
      hadError = true;
      console.error(`ERROR: Failed processing ${spec.md}`);
      console.error(err.message);
    }
  }

  if (hadError) process.exit(1);
}

main();