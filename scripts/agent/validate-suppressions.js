#!/usr/bin/env node

/**
 * Validates suppression JSON files against schema + policy checks:
 * - JSON schema validity
 * - active suppressions not expired
 * - ID prefix matches file type
 */

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ROOT = process.cwd();
const SCHEMA_PATH = path.join(ROOT, "docs/agent-stack/suppression.schema.json");

const FILES = [
  {
    type: "security",
    file: path.join(ROOT, "docs/agent-stack/security-suppressions.json"),
    prefix: "SEC-",
  },
  {
    type: "review",
    file: path.join(ROOT, "docs/agent-stack/review-suppressions.json"),
    prefix: "REV-",
  },
  {
    type: "ui",
    file: path.join(ROOT, "docs/agent-stack/ui-suppressions.json"),
    prefix: "UI-",
  },
];

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function isExpired(yyyyMmDd) {
  const today = new Date();
  const utcToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  return d < utcToday;
}

function main() {
  let failed = false;

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`ERROR: Missing schema: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = readJson(SCHEMA_PATH);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  for (const spec of FILES) {
    if (!fs.existsSync(spec.file)) {
      console.warn(`WARN: Missing file, skipping: ${spec.file}`);
      continue;
    }

    let entries;
    try {
      entries = readJson(spec.file);
    } catch (err) {
      console.error(`ERROR: Invalid JSON in ${spec.file}`);
      console.error(err.message);
      failed = true;
      continue;
    }

    if (!Array.isArray(entries)) {
      console.error(`ERROR: ${spec.file} must be a JSON array`);
      failed = true;
      continue;
    }

    entries.forEach((entry, idx) => {
      const label = `${path.basename(spec.file)}[${idx}]`;

      // Schema validation
      const ok = validate(entry);
      if (!ok) {
        failed = true;
        console.error(`ERROR: Schema validation failed for ${label}`);
        for (const e of validate.errors || []) {
          console.error(`  - ${e.instancePath || "/"} ${e.message}`);
        }
      }

      // ID prefix check
      if (typeof entry.id === "string" && !entry.id.startsWith(spec.prefix)) {
        failed = true;
        console.error(
          `ERROR: ${label} id '${entry.id}' must start with '${spec.prefix}'`
        );
      }

      // Type check by file
      if (entry.type && entry.type !== spec.type) {
        failed = true;
        console.error(
          `ERROR: ${label} type '${entry.type}' does not match file type '${spec.type}'`
        );
      }

      // Expiry check for active suppressions
      if (entry.status === "active" && entry.expiry) {
        if (isExpired(entry.expiry)) {
          failed = true;
          console.error(
            `ERROR: ${label} is active but expired on ${entry.expiry}`
          );
        }
      }
    });
  }

  if (failed) {
    console.error("\nSuppression validation failed.");
    process.exit(1);
  }

  console.log("Suppression validation passed.");
}

main();