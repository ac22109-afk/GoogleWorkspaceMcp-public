#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getAuthStatus as live_getAuthStatus, startOAuth as live_startOAuth } from "./auth.js";
import {
  calendarEventCreate as live_calendarEventCreate,
  calendarEventUpdate as live_calendarEventUpdate,
  calendarEventsSearch as live_calendarEventsSearch,
  calendarList as live_calendarList
} from "./calendar.js";
import {
  gmailApplyLabel as live_gmailApplyLabel,
  gmailArchive as live_gmailArchive,
  gmailCreateDraft as live_gmailCreateDraft,
  gmailListLabels as live_gmailListLabels,
  gmailRead as live_gmailRead,
  gmailSearch as live_gmailSearch
} from "./gmail.js";
import { dataPaths as live_dataPaths, loadAccounts as live_loadAccounts } from "./storage.js";

import { config } from "./config.js";
import * as demo from "./demo.js";
const getAuthStatus = config.mode === "demo" ? demo.getAuthStatus : live_getAuthStatus;
const startOAuth = config.mode === "demo" ? demo.startOAuth : live_startOAuth;
const calendarEventCreate = config.mode === "demo" ? demo.calendarEventCreate : live_calendarEventCreate;
const calendarEventUpdate = config.mode === "demo" ? demo.calendarEventUpdate : live_calendarEventUpdate;
const calendarEventsSearch = config.mode === "demo" ? demo.calendarEventsSearch : live_calendarEventsSearch;
const calendarList = config.mode === "demo" ? demo.calendarList : live_calendarList;
const gmailApplyLabel = config.mode === "demo" ? demo.gmailApplyLabel : live_gmailApplyLabel;
const gmailArchive = config.mode === "demo" ? demo.gmailArchive : live_gmailArchive;
const gmailCreateDraft = config.mode === "demo" ? demo.gmailCreateDraft : live_gmailCreateDraft;
const gmailListLabels = config.mode === "demo" ? demo.gmailListLabels : live_gmailListLabels;
const gmailRead = config.mode === "demo" ? demo.gmailRead : live_gmailRead;
const gmailSearch = config.mode === "demo" ? demo.gmailSearch : live_gmailSearch;
const dataPaths = config.mode === "demo" ? demo.dataPaths : live_dataPaths;
const loadAccounts = config.mode === "demo" ? demo.loadAccounts : live_loadAccounts;

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

const accountShape = { account: z.string().min(1) };

const server = new McpServer({
  name: "google_workspace_public",
  version: "0.2.0"
});

server.tool("google_accounts_list", "List configured Google account aliases.", {}, async () => {
  const accounts = await loadAccounts();
  const statuses = await Promise.all(accounts.map((account) => getAuthStatus(account.alias)));
  return jsonContent({ paths: dataPaths(), accounts: statuses });
});

server.tool(
  "google_auth_start",
  "Start browser OAuth for a configured account alias and save its token.",
  accountShape,
  async ({ account }) => jsonContent(await startOAuth(account))
);

server.tool(
  "google_auth_status",
  "Show authentication status and missing OAuth scopes for an account alias.",
  accountShape,
  async ({ account }) => jsonContent(await getAuthStatus(account))
);

server.tool(
  "gmail_search",
  "Search Gmail messages. Uses Gmail search syntax in query.",
  {
    ...accountShape,
    query: z.string().optional(),
    maxResults: z.number().int().min(1).max(50).default(10)
  },
  async (input) => jsonContent(await gmailSearch(input))
);

server.tool(
  "gmail_read",
  "Read a Gmail message body, headers, labels, and attachment summaries.",
  {
    ...accountShape,
    messageId: z.string().min(1)
  },
  async (input) => jsonContent(await gmailRead(input))
);

server.tool(
  "gmail_list_labels",
  "List Gmail labels for an account.",
  accountShape,
  async (input) => jsonContent(await gmailListLabels(input))
);

if (config.enableWrites) {
server.tool(
  "gmail_apply_label",
  "Apply a Gmail label by label id or label name.",
  {
    ...accountShape,
    messageId: z.string().min(1),
    label: z.string().min(1)
  },
  async (input) => jsonContent(await gmailApplyLabel(input))
);
}


if (config.enableWrites) {
server.tool(
  "gmail_archive",
  "Archive a Gmail message by removing the INBOX label.",
  {
    ...accountShape,
    messageId: z.string().min(1)
  },
  async (input) => jsonContent(await gmailArchive(input))
);
}


if (config.enableWrites) {
server.tool(
  "gmail_create_draft",
  "Create a Gmail draft. This tool never sends mail.",
  {
    ...accountShape,
    to: z.array(z.string().email()).min(1),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    from: z.string().email().optional(),
    subject: z.string().min(1),
    body: z.string().min(1)
  },
  async (input) => jsonContent(await gmailCreateDraft(input))
);
}


server.tool(
  "calendar_list",
  "List Google Calendar calendars for an account.",
  accountShape,
  async (input) => jsonContent(await calendarList(input))
);

server.tool(
  "calendar_events_search",
  "Search Google Calendar events in a date/time range.",
  {
    ...accountShape,
    calendarId: z.string().optional(),
    timeMin: z.string().datetime(),
    timeMax: z.string().datetime(),
    query: z.string().optional(),
    maxResults: z.number().int().min(1).max(100).default(20)
  },
  async (input) => jsonContent(await calendarEventsSearch(input))
);

if (config.enableWrites) {
server.tool(
  "calendar_event_create",
  "Create a Google Calendar event.",
  {
    ...accountShape,
    calendarId: z.string().optional(),
    summary: z.string().min(1),
    start: z.string().datetime(),
    end: z.string().datetime(),
    timeZone: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string().email()).optional()
  },
  async (input) => jsonContent(await calendarEventCreate(input))
);
}


if (config.enableWrites) {
server.tool(
  "calendar_event_update",
  "Update an existing Google Calendar event. Event deletion is not exposed.",
  {
    ...accountShape,
    calendarId: z.string().optional(),
    eventId: z.string().min(1),
    summary: z.string().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    timeZone: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string().email()).optional()
  },
  async (input) => jsonContent(await calendarEventUpdate(input))
);
}


const transport = new StdioServerTransport();
await server.connect(transport);
