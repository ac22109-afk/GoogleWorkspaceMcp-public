import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { CREDENTIALS_PATH, tokenPathForAlias } from "./paths.js";
import { REQUIRED_SCOPES, missingRequiredScopes, parseTokenScopes } from "./scopes.js";
import { credentialsAvailable, ensureDataDirs, pathExists, readJson, resolveAccount, writeJson } from "./storage.js";

type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;
type GoogleCredentials = GoogleOAuth2Client["credentials"];

interface OAuthClientCredentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
}

export interface AuthStatus {
  account: string;
  email: string;
  authenticated: boolean;
  tokenPath: string;
  grantedScopes: string[];
  missingScopes: string[];
}

async function createOAuthClientFromCredentials(tokens?: GoogleCredentials): Promise<GoogleOAuth2Client> {
  if (!(await credentialsAvailable())) {
    throw new Error(`Missing Google OAuth credentials at ${CREDENTIALS_PATH}.`);
  }

  const credentials = await readJson<OAuthClientCredentials>(CREDENTIALS_PATH);
  const clientConfig = credentials.installed ?? credentials.web;
  if (!clientConfig) {
    throw new Error("credentials.json is missing an installed/web OAuth client definition.");
  }

  const client = new google.auth.OAuth2({
    clientId: clientConfig.client_id,
    clientSecret: clientConfig.client_secret,
    redirectUri: clientConfig.redirect_uris?.[0] ?? "http://localhost"
  });

  if (tokens) {
    client.setCredentials(tokens);
  }

  return client;
}

export async function getAuthStatus(accountAlias: string): Promise<AuthStatus> {
  const account = await resolveAccount(accountAlias);
  const tokenPath = tokenPathForAlias(account.alias);
  const authenticated = await pathExists(tokenPath);
  const token = authenticated ? await readJson<GoogleCredentials & { scope?: string }>(tokenPath) : undefined;
  const grantedScopes = parseTokenScopes(token?.scope);

  return {
    account: account.alias,
    email: account.email,
    authenticated,
    tokenPath,
    grantedScopes,
    missingScopes: missingRequiredScopes(grantedScopes)
  };
}

export async function authorize(accountAlias: string): Promise<GoogleOAuth2Client> {
  const status = await getAuthStatus(accountAlias);
  if (!status.authenticated) {
    throw new Error(`Account ${status.account} is not authenticated. Run google_auth_start for this account first.`);
  }
  if (status.missingScopes.length > 0) {
    throw new Error(`Account ${status.account} is missing OAuth scopes: ${status.missingScopes.join(", ")}`);
  }

  const tokens = await readJson<GoogleCredentials>(status.tokenPath);
  const client = await createOAuthClientFromCredentials(tokens);
  await verifyAccountIdentity(client, status.email);
  return client;
}

export async function startOAuth(accountAlias: string): Promise<AuthStatus> {
  const account = await resolveAccount(accountAlias);
  await ensureDataDirs();
  if (!(await credentialsAvailable())) {
    throw new Error(`Missing Google OAuth credentials at ${CREDENTIALS_PATH}.`);
  }

  const client = await authenticate({
    keyfilePath: CREDENTIALS_PATH,
    scopes: [...REQUIRED_SCOPES]
  });

  // local-auth and googleapis can bundle different auth-library generations.
  // Rebuild from the returned credentials rather than mixing client instances.
  const verifiedClient = await createOAuthClientFromCredentials(client.credentials);
  await verifyAccountIdentity(verifiedClient, account.email);
  const tokenPath = tokenPathForAlias(account.alias);
  await writeJson(tokenPath, client.credentials);
  return getAuthStatus(account.alias);
}

export async function verifyAccountIdentity(client: GoogleOAuth2Client, expected: string): Promise<void> {
  const profile = await google.gmail({ version: "v1", auth: client }).users.getProfile({ userId: "me" });
  const actual = profile.data.emailAddress?.trim().toLowerCase();
  if (!actual || actual !== expected.trim().toLowerCase()) {
    throw new Error("Authenticated Google account does not match the configured email; refusing access.");
  }
}
