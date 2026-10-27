import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
await fs.mkdir(path.join(root, "work"), { recursive: true });
const writeNames = ["gmail_apply_label", "gmail_archive", "gmail_create_draft", "calendar_event_create", "calendar_event_update"];
for (const [mode, writes] of [["demo", false], ["google", false], ["google", true]]) {
  const config = path.join(root, "work", `integration-${mode}-${writes}.json`);
  await fs.writeFile(config, JSON.stringify({ mode, enableWrites: writes }));
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, "dist/server.js")], cwd: root,
    env: { GWMCP_CONFIG: config, GWMCP_DATA_DIR: path.join(root, "work", "isolated-no-credentials") } });
  const client = new Client({ name: "public-edition-check", version: "1.0.0" });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const names = tools.map(t => t.name);
    for (const name of writeNames) assert.equal(names.includes(name), writes);
    for (const tool of tools.filter(t => t.name !== "google_accounts_list")) {
      assert.ok(tool.inputSchema.required.includes("account"));
    }
    if (mode === "demo") {
      const accounts = await client.callTool({ name: "google_accounts_list", arguments: {} });
      assert.equal(JSON.parse(accounts.content[0].text).accounts[0].synthetic, true);
      const result = await client.callTool({ name: "gmail_search", arguments: { account: "demo" } });
      assert.equal(JSON.parse(result.content[0].text).synthetic, true);
    }
    console.log(`${mode}, writes=${writes}: ${tools.length} tools, schema and routing passed`);
  } finally {
    await client.close();
  }
}
