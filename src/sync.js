import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import SftpClient from "ssh2-sftp-client";
import { transformInventory } from "./schema.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "inventory.json");
const TMP_DIR = path.join(ROOT, "tmp");

async function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const text = await readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function parseInventoryBuffer(content, sourceName) {
  const text = content.toString("utf8").replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error(`Inventory file is empty: ${sourceName}`);
  }

  const looksJson =
    sourceName.toLowerCase().endsWith(".json") ||
    text.startsWith("[") ||
    text.startsWith("{");

  if (looksJson) {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.vehicles)) {
      return data.vehicles;
    }
    throw new Error(`JSON inventory must be an array (or { vehicles: [] }): ${sourceName}`);
  }

  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
    bom: true,
  });
}

async function loadFixture(relativePath) {
  const filePath = path.resolve(ROOT, relativePath);
  const buffer = await readFile(filePath);
  return parseInventoryBuffer(buffer, filePath);
}

async function downloadFromSftp() {
  const host = process.env.SFTP_HOST;
  const username = process.env.SFTP_USER;
  const password = process.env.SFTP_PASSWORD;
  const remotePath = process.env.SFTP_REMOTE_PATH;
  const port = Number.parseInt(process.env.SFTP_PORT || "22", 10);

  if (!host || !username || !password || !remotePath) {
    throw new Error(
      "Missing SFTP env vars. Required: SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH"
    );
  }

  await mkdir(TMP_DIR, { recursive: true });
  const localPath = path.join(TMP_DIR, path.basename(remotePath) || "inventory.csv");

  const client = new SftpClient();
  try {
    await client.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 30000,
    });
    await client.fastGet(remotePath, localPath);
  } finally {
    await client.end().catch(() => {});
  }

  const buffer = await readFile(localPath);
  return parseInventoryBuffer(buffer, remotePath);
}

async function main() {
  await loadDotEnv();
  const fixture = getArg("--fixture");
  const rows = fixture ? await loadFixture(fixture) : await downloadFromSftp();
  const inventory = transformInventory(rows);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${inventory.count} vehicle(s) to ${path.relative(ROOT, OUTPUT_FILE)} (updatedAt: ${inventory.updatedAt})`
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
