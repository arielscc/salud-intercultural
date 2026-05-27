const localHosts = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"]);
const blockedHostFragments = ["neon.tech", "vercel-storage.com", "vercel-database.com", "vercel.app"];
const protectedSiteFragment = "saludintercultural.com";
const dangerousDatabaseNamePattern = /(^|[_-])(prod|production|staging)([_-]|$)/i;

type DatabaseSafetyOptions = {
  allowedDatabaseNames?: string[];
  allowRemoteOverrideEnv?: string;
  commandName: string;
  databaseUrl?: string;
  nextPublicSiteUrl?: string;
  requireLocalHost?: boolean;
};

function parseDatabaseUrl(databaseUrl: string) {
  try {
    return new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
}

function getDatabaseName(parsedUrl: URL) {
  return decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
}

function hasProtectedSiteUrl(siteUrl: string | undefined) {
  return siteUrl?.toLowerCase().includes(protectedSiteFragment) ?? false;
}

function hasBlockedHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase();
  return blockedHostFragments.some((fragment) => normalizedHost.includes(fragment));
}

function hasProtectedDatabaseUrl(databaseUrl: string) {
  return databaseUrl.toLowerCase().includes(protectedSiteFragment);
}

function isLocalHost(hostname: string) {
  return localHosts.has(hostname.toLowerCase());
}

function getOverrideValue(envName: string | undefined) {
  return envName ? process.env[envName] === "true" : false;
}

export function assertSafeDatabaseCommand(options: DatabaseSafetyOptions) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running a database command.");
  }

  const parsedUrl = parseDatabaseUrl(databaseUrl);
  const databaseName = getDatabaseName(parsedUrl);
  const overrideEnabled = getOverrideValue(options.allowRemoteOverrideEnv);

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  if (hasProtectedSiteUrl(options.nextPublicSiteUrl ?? process.env.NEXT_PUBLIC_SITE_URL)) {
    throw new Error(
      `Refusing to run ${options.commandName}: NEXT_PUBLIC_SITE_URL points to ${protectedSiteFragment}.`
    );
  }

  if (hasProtectedDatabaseUrl(databaseUrl)) {
    throw new Error(
      `Refusing to run ${options.commandName}: DATABASE_URL references ${protectedSiteFragment}.`
    );
  }

  if (hasBlockedHost(parsedUrl.hostname)) {
    throw new Error(
      `Refusing to run ${options.commandName}: database host "${parsedUrl.hostname}" looks remote or managed.`
    );
  }

  if (dangerousDatabaseNamePattern.test(databaseName)) {
    throw new Error(
      `Refusing to run ${options.commandName}: database name "${databaseName}" looks like staging or production.`
    );
  }

  if (
    options.allowedDatabaseNames &&
    !options.allowedDatabaseNames.includes(databaseName)
  ) {
    throw new Error(
      `Refusing to run ${options.commandName}: database "${databaseName}" is not in the allowed list (${options.allowedDatabaseNames.join(", ")}).`
    );
  }

  if (options.requireLocalHost && !isLocalHost(parsedUrl.hostname) && !overrideEnabled) {
    throw new Error(
      `Refusing to run ${options.commandName}: database host "${parsedUrl.hostname}" is not local. Set ${options.allowRemoteOverrideEnv ?? "the override env var"}=true only for an explicitly approved non-production reset.`
    );
  }
}
