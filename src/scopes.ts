import { config } from "./config.js";
const ALL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events"
] as const;

export const REQUIRED_SCOPES = config.enableWrites ? ALL_SCOPES : [ALL_SCOPES[0], ALL_SCOPES[3]] as const;

export type RequiredScope = (typeof REQUIRED_SCOPES)[number];

export function parseTokenScopes(scope: unknown): string[] {
  if (typeof scope !== "string") {
    return [];
  }
  return scope.split(/\s+/).map((value) => value.trim()).filter(Boolean);
}

export function missingRequiredScopes(grantedScopes: string[]): string[] {
  const granted = new Set(grantedScopes);
  return REQUIRED_SCOPES.filter((scope) => !granted.has(scope));
}
