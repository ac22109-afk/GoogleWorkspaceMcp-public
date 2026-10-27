/** Synthetic adapter: no Google API, filesystem account data, OAuth or tokens. */
import type * as Gmail from "./gmail.js";
import type * as Calendar from "./calendar.js";

const account = { account: "demo", email: "demo@example.com", authenticated: false,
  tokenPath: "", grantedScopes: [], missingScopes: [], synthetic: true };
export async function loadAccounts() { return [{ alias: "demo", email: account.email }]; }
export async function getAuthStatus(_alias: string) { return account; }
export async function startOAuth(_alias: string) { return account; }
export function dataPaths() { return { mode: "demo", synthetic: true }; }
const message = { id: "demo-message-1", threadId: "demo-thread-1", labelIds: ["INBOX"],
  date: "2026-01-01T09:00:00Z", from: "sender@example.com", to: "demo@example.com", cc: "",
  subject: "Demo meeting", snippet: "Synthetic sample message." };
export async function gmailSearch(_input: Parameters<typeof Gmail.gmailSearch>[0]) {
  return { synthetic: true, resultSizeEstimate: 1, messages: [message] };
}
export async function gmailRead(_input: Parameters<typeof Gmail.gmailRead>[0]) {
  return { synthetic: true, ...message, body: "This is fictional demonstration data.", attachments: [] };
}
export async function gmailListLabels(_input: Parameters<typeof Gmail.gmailListLabels>[0]) {
  return { synthetic: true, labels: [{ id: "INBOX", name: "INBOX", type: "system", messagesTotal: 1, messagesUnread: 1 }] };
}
export async function gmailApplyLabel(_input: Parameters<typeof Gmail.gmailApplyLabel>[0]) { return { synthetic: true, ...message }; }
export async function gmailArchive(_input: Parameters<typeof Gmail.gmailArchive>[0]) { return { synthetic: true, ...message, labelIds: [] }; }
export async function gmailCreateDraft(_input: Parameters<typeof Gmail.gmailCreateDraft>[0]) {
  return { synthetic: true, draftId: "demo-draft-1", messageId: message.id, threadId: message.threadId };
}
const event = { id: "demo-event-1", summary: "Demo review", description: "Fictional event",
  start: { dateTime: "2026-01-01T09:00:00Z" }, end: { dateTime: "2026-01-01T10:00:00Z" }, attendees: [] };
export async function calendarList(_input: Parameters<typeof Calendar.calendarList>[0]) {
  return { synthetic: true, calendars: [{ id: "primary", summary: "Demo", primary: true, accessRole: "reader", timeZone: "UTC" }] };
}
export async function calendarEventsSearch(_input: Parameters<typeof Calendar.calendarEventsSearch>[0]) {
  return { synthetic: true, events: [event] };
}
export async function calendarEventCreate(_input: Parameters<typeof Calendar.calendarEventCreate>[0]) { return { synthetic: true, ...event }; }
export async function calendarEventUpdate(_input: Parameters<typeof Calendar.calendarEventUpdate>[0]) { return { synthetic: true, ...event }; }
