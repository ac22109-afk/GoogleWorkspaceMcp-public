import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const staged = process.argv.includes("--staged");
const args = staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "-z"];
const files = execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
const errors = [];
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  /\bAIza[A-Za-z0-9_-]{30,}\b/,
  /\bya29\.[A-Za-z0-9_-]{20,}/,
  /["'](?:refresh_token|access_token|client_secret)["']\s*:\s*["'][^"'\s]{30,}["']/,
  /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/,
  /[A-Za-z]:\\Users\\(?!<USER>)[^\\\s"']+/i
];
for (const file of files) {
  const base = path.basename(file).toLowerCase();
  const isExample = /\.example\.(json|env)$/.test(base) || base === ".env.example";
  if ((!isExample && /^(?:config|accounts|credentials[^/]*|tokens?[^/]*)\.json$/.test(base)) ||
      (base.startsWith(".env") && base !== ".env.example") ||
      /\.(?:pem|key|pfx|p12|db|sqlite3|exe|zip)$/.test(base) ||
      file.split("/").some(p => ["node_modules", "dist", "tokens", "work", "outputs"].includes(p))) {
    errors.push(`${file}: forbidden distribution path`);
  }
  const text = staged ? execFileSync("git", ["show", `:${file}`], { encoding: "utf8" }) : fs.readFileSync(file, "utf8");
  if (patterns.some(pattern => pattern.test(text))) errors.push(`${file}: possible sensitive content`);
  // Permit documented domain examples; never print addresses in error messages.
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (emails.some(email => !email.endsWith("@example.com") && !email.endsWith("@users.noreply.github.com"))) {
    errors.push(`${file}: non-example email address requires review`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Public source check passed (${files.length} files). This is a limited pattern check, not a complete secrets audit.`);
