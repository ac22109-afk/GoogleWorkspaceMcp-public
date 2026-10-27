import { google, calendar_v3 } from "googleapis";
import { authorize } from "./auth.js";

type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export function createCalendarClient(auth: GoogleOAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth });
}

function eventSummary(event: calendar_v3.Schema$Event) {
  return {
    id: event.id ?? "",
    htmlLink: event.htmlLink ?? "",
    status: event.status ?? "",
    summary: event.summary ?? "",
    description: event.description ?? "",
    location: event.location ?? "",
    start: event.start ?? {},
    end: event.end ?? {},
    attendees: event.attendees?.map((attendee) => ({
      email: attendee.email ?? "",
      displayName: attendee.displayName ?? "",
      responseStatus: attendee.responseStatus ?? ""
    })) ?? []
  };
}

export async function calendarList(input: { account: string }) {
  const auth = await authorize(input.account);
  const calendar = createCalendarClient(auth);
  const response = await calendar.calendarList.list();
  return {
    calendars: (response.data.items ?? []).map((item) => ({
      id: item.id ?? "",
      summary: item.summary ?? "",
      description: item.description ?? "",
      primary: item.primary ?? false,
      accessRole: item.accessRole ?? "",
      timeZone: item.timeZone ?? ""
    }))
  };
}

export async function calendarEventsSearch(input: {
  account: string;
  calendarId?: string;
  timeMin: string;
  timeMax: string;
  query?: string;
  maxResults?: number;
}) {
  const auth = await authorize(input.account);
  const calendar = createCalendarClient(auth);
  const response = await calendar.events.list({
    calendarId: input.calendarId ?? "primary",
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    q: input.query || undefined,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: Math.min(Math.max(input.maxResults ?? 20, 1), 100)
  });
  return { events: (response.data.items ?? []).map(eventSummary) };
}

export async function calendarEventCreate(input: {
  account: string;
  calendarId?: string;
  summary: string;
  start: string;
  end: string;
  timeZone?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}) {
  const auth = await authorize(input.account);
  const calendar = createCalendarClient(auth);
  const response = await calendar.events.insert({
    calendarId: input.calendarId ?? "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: { dateTime: input.start, timeZone: input.timeZone },
      end: { dateTime: input.end, timeZone: input.timeZone },
      attendees: input.attendees?.map((email) => ({ email }))
    }
  });
  return eventSummary(response.data);
}

export async function calendarEventUpdate(input: {
  account: string;
  eventId: string;
  calendarId?: string;
  summary?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}) {
  const auth = await authorize(input.account);
  const calendar = createCalendarClient(auth);
  const current = await calendar.events.get({
    calendarId: input.calendarId ?? "primary",
    eventId: input.eventId
  });

  if (!current.data.etag) throw new Error("Missing event version; refusing an unprotected update.");
  const response = await calendar.events.update({
    calendarId: input.calendarId ?? "primary",
    eventId: input.eventId,
    requestBody: {
      ...current.data,
      summary: input.summary ?? current.data.summary,
      description: input.description ?? current.data.description,
      location: input.location ?? current.data.location,
      start: input.start ? { dateTime: input.start, timeZone: input.timeZone } : current.data.start,
      end: input.end ? { dateTime: input.end, timeZone: input.timeZone } : current.data.end,
      attendees: input.attendees ? input.attendees.map((email) => ({ email })) : current.data.attendees
    }
  }, { headers: { "If-Match": current.data.etag } });
  return eventSummary(response.data);
}
