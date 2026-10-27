import { google, gmail_v1 } from "googleapis";
import { authorize } from "./auth.js";

type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export function createGmailClient(auth: GoogleOAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth });
}

function decodeBase64Url(input?: string | null): string {
  if (!input) {
    return "";
  }
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) {
    return "";
  }
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  const parts = payload.parts ?? [];
  const preferred =
    parts.find((part) => part.mimeType === "text/plain" && part.body?.data) ??
    parts.find((part) => part.mimeType === "text/html" && part.body?.data) ??
    parts.find((part) => part.body?.data);
  if (preferred) {
    return extractBody(preferred);
  }
  for (const part of parts) {
    const nested = extractBody(part);
    if (nested) {
      return nested;
    }
  }
  return "";
}

function attachments(payload?: gmail_v1.Schema$MessagePart): Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> {
  const results: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> = [];
  const visit = (part?: gmail_v1.Schema$MessagePart) => {
    if (!part) {
      return;
    }
    if (part.filename && part.body?.attachmentId) {
      results.push({
        filename: part.filename,
        mimeType: part.mimeType ?? "",
        attachmentId: part.body.attachmentId,
        size: part.body.size ?? 0
      });
    }
    for (const child of part.parts ?? []) {
      visit(child);
    }
  };
  visit(payload);
  return results;
}

function summarize(message: gmail_v1.Schema$Message) {
  const headers = message.payload?.headers ?? [];
  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    labelIds: message.labelIds ?? [],
    date: header(headers, "Date"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    cc: header(headers, "Cc"),
    subject: header(headers, "Subject"),
    snippet: message.snippet ?? ""
  };
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeaderValue(value: string): string {
  const sanitized = sanitizeHeaderValue(value);
  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }
  return `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

export function encodeRawMessage(input: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; body: string; from?: string }): string {
  const lines = [
    ...(input.from ? [`From: ${sanitizeHeaderValue(input.from)}`] : []),
    `To: ${input.to.map(sanitizeHeaderValue).join(", ")}`,
    ...(input.cc?.length ? [`Cc: ${input.cc.map(sanitizeHeaderValue).join(", ")}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${input.bcc.map(sanitizeHeaderValue).join(", ")}`] : []),
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "",
    input.body
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function gmailSearch(input: { account: string; query?: string; maxResults?: number }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const list = await gmail.users.messages.list({
    userId: "me",
    q: input.query || undefined,
    maxResults: Math.min(Math.max(input.maxResults ?? 10, 1), 50)
  });
  const messages = [];
  for (const item of list.data.messages ?? []) {
    if (!item.id) {
      continue;
    }
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: item.id,
      format: "metadata",
      metadataHeaders: ["Date", "From", "To", "Cc", "Subject"]
    });
    messages.push(summarize(detail.data));
  }
  return { resultSizeEstimate: list.data.resultSizeEstimate ?? 0, messages };
}

export async function gmailRead(input: { account: string; messageId: string }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const response = await gmail.users.messages.get({ userId: "me", id: input.messageId, format: "full" });
  return {
    ...summarize(response.data),
    body: extractBody(response.data.payload),
    attachments: attachments(response.data.payload)
  };
}

export async function gmailListLabels(input: { account: string }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const response = await gmail.users.labels.list({ userId: "me" });
  return {
    labels: (response.data.labels ?? []).map((label) => ({
      id: label.id ?? "",
      name: label.name ?? "",
      type: label.type ?? "",
      messagesTotal: label.messagesTotal ?? 0,
      messagesUnread: label.messagesUnread ?? 0
    }))
  };
}

async function resolveLabelId(gmail: gmail_v1.Gmail, labelRef: string): Promise<string> {
  const labels = (await gmail.users.labels.list({ userId: "me" })).data.labels ?? [];
  const label = labels.find((item) => item.id === labelRef || item.name === labelRef);
  if (!label?.id) {
    throw new Error(`Label not found: ${labelRef}`);
  }
  return label.id;
}

export async function gmailApplyLabel(input: { account: string; messageId: string; label: string }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const labelId = await resolveLabelId(gmail, input.label);
  const response = await gmail.users.messages.modify({
    userId: "me",
    id: input.messageId,
    requestBody: { addLabelIds: [labelId] }
  });
  return { id: response.data.id ?? "", threadId: response.data.threadId ?? "", labelIds: response.data.labelIds ?? [] };
}

export async function gmailArchive(input: { account: string; messageId: string }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const response = await gmail.users.messages.modify({
    userId: "me",
    id: input.messageId,
    requestBody: { removeLabelIds: ["INBOX"] }
  });
  return { id: response.data.id ?? "", threadId: response.data.threadId ?? "", labelIds: response.data.labelIds ?? [] };
}

export async function gmailCreateDraft(input: { account: string; to: string[]; subject: string; body: string; cc?: string[]; bcc?: string[]; from?: string }) {
  const auth = await authorize(input.account);
  const gmail = createGmailClient(auth);
  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodeRawMessage(input)
      }
    }
  });
  return { draftId: response.data.id ?? "", messageId: response.data.message?.id ?? "", threadId: response.data.message?.threadId ?? "" };
}
