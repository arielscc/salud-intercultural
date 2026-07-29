export const deploymentEnvironments = ["local", "test", "staging", "production"] as const;

export type DeploymentEnvironment = (typeof deploymentEnvironments)[number];

export type EnvironmentVariables = Record<string, string | undefined>;

export type EnvironmentIsolationSummary = {
  environment: DeploymentEnvironment;
  databaseEnvironment?: string;
  storageEnvironment?: string;
  externalCommunicationsMode: "blocked" | "enabled";
  analyticsEnabled: boolean;
  blobStorageConfigured: boolean;
};

const productionHost = "saludintercultural.com";
const stagingHost = "staging.saludintercultural.com";

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function resolveBlobReadWriteToken(
  values: EnvironmentVariables = process.env
) {
  const environment = resolveDeploymentEnvironment(values);

  return environment === "staging"
    ? clean(values.STAGING_BLOB_READ_WRITE_TOKEN)
    : clean(values.BLOB_READ_WRITE_TOKEN);
}

function parseDeploymentEnvironment(
  value: string | undefined,
  variableName: string
): DeploymentEnvironment | undefined {
  const normalized = clean(value);

  if (!normalized) return undefined;

  if (!deploymentEnvironments.includes(normalized as DeploymentEnvironment)) {
    throw new Error(
      `${variableName} must be one of: ${deploymentEnvironments.join(", ")}.`
    );
  }

  return normalized as DeploymentEnvironment;
}

function inferVercelEnvironment(values: EnvironmentVariables): DeploymentEnvironment | undefined {
  const vercelEnvironment = clean(values.VERCEL_ENV);

  if (vercelEnvironment === "production") return "production";

  if (
    vercelEnvironment === "preview" &&
    clean(values.VERCEL_GIT_COMMIT_REF) === "staging"
  ) {
    return "staging";
  }

  if (vercelEnvironment === "preview") return "test";
  return undefined;
}

function hostnameFromUrl(value: string | undefined, variableName: string) {
  const normalized = clean(value);

  if (!normalized) {
    throw new Error(`${variableName} is required.`);
  }

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    throw new Error(`${variableName} must be a valid URL.`);
  }
}

function parseDatabaseUrl(value: string | undefined) {
  const normalized = clean(value);

  if (!normalized) {
    throw new Error("DATABASE_URL is required.");
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  return {
    databaseName: decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase(),
    hostname: url.hostname.toLowerCase(),
    username: decodeURIComponent(url.username).toLowerCase()
  };
}

function requireExactValue(
  values: EnvironmentVariables,
  variableName: string,
  expected: string
) {
  const actual = clean(values[variableName]);

  if (actual !== expected) {
    throw new Error(`${variableName} must be "${expected}" in ${expected}.`);
  }
}

function assertNoAnalytics(values: EnvironmentVariables) {
  const configuredAnalytics = [
    "NEXT_PUBLIC_GA_ID",
    "NEXT_PUBLIC_META_PIXEL_ID",
    "GOOGLE_SITE_VERIFICATION"
  ].filter((variableName) => clean(values[variableName]));

  if (configuredAnalytics.length > 0) {
    throw new Error(
      `Staging must not use production analytics or verification: clear ${configuredAnalytics.join(", ")}.`
    );
  }
}

function assertStagingIsolation(values: EnvironmentVariables) {
  requireExactValue(values, "APP_ENV", "staging");
  requireExactValue(values, "NEXT_PUBLIC_APP_ENV", "staging");
  requireExactValue(values, "DATABASE_ENVIRONMENT", "staging");
  requireExactValue(values, "STORAGE_ENVIRONMENT", "staging");
  requireExactValue(values, "EXTERNAL_COMMUNICATIONS_MODE", "blocked");

  const siteHostname = hostnameFromUrl(values.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  const payloadHostname = hostnameFromUrl(
    values.PAYLOAD_PUBLIC_SERVER_URL,
    "PAYLOAD_PUBLIC_SERVER_URL"
  );

  if (siteHostname !== stagingHost || payloadHostname !== stagingHost) {
    throw new Error(
      `Staging URLs must use https://${stagingHost}; production and arbitrary preview URLs are rejected.`
    );
  }

  const database = parseDatabaseUrl(values.DATABASE_URL);
  const databaseIdentity = `${database.username}/${database.hostname}/${database.databaseName}`;

  if (!database.databaseName.includes("staging") || /(^|[_./-])prod(uction)?([_./-]|$)/i.test(databaseIdentity)) {
    throw new Error(
      'Staging DATABASE_URL must use a database name containing "staging" and must not contain production markers.'
    );
  }

  const payloadSchema = clean(values.PAYLOAD_DB_SCHEMA);

  if (!payloadSchema?.toLowerCase().includes("staging")) {
    throw new Error('PAYLOAD_DB_SCHEMA must contain "staging".');
  }

  if (!clean(values.STAGING_BLOB_READ_WRITE_TOKEN)) {
    throw new Error(
      "STAGING_BLOB_READ_WRITE_TOKEN is required for isolated staging storage."
    );
  }

  assertNoAnalytics(values);
}

function assertProductionIsolation(values: EnvironmentVariables) {
  requireExactValue(values, "APP_ENV", "production");
  requireExactValue(values, "NEXT_PUBLIC_APP_ENV", "production");
  requireExactValue(values, "DATABASE_ENVIRONMENT", "production");
  requireExactValue(values, "STORAGE_ENVIRONMENT", "production");
  requireExactValue(values, "EXTERNAL_COMMUNICATIONS_MODE", "enabled");

  const siteHostname = hostnameFromUrl(values.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  const payloadHostname = hostnameFromUrl(
    values.PAYLOAD_PUBLIC_SERVER_URL,
    "PAYLOAD_PUBLIC_SERVER_URL"
  );

  if (siteHostname !== productionHost || payloadHostname !== productionHost) {
    throw new Error(`Production URLs must use https://${productionHost}.`);
  }

  const database = parseDatabaseUrl(values.DATABASE_URL);
  const databaseIdentity = `${database.username}/${database.hostname}/${database.databaseName}`;

  if (databaseIdentity.includes("staging")) {
    throw new Error("Production DATABASE_URL must not reference staging.");
  }

  if (clean(values.PAYLOAD_DB_SCHEMA)?.toLowerCase().includes("staging")) {
    throw new Error("Production PAYLOAD_DB_SCHEMA must not reference staging.");
  }
}

export function resolveDeploymentEnvironment(
  values: EnvironmentVariables = process.env
): DeploymentEnvironment {
  const privateEnvironment = parseDeploymentEnvironment(values.APP_ENV, "APP_ENV");
  const publicEnvironment = parseDeploymentEnvironment(
    values.NEXT_PUBLIC_APP_ENV,
    "NEXT_PUBLIC_APP_ENV"
  );

  if (
    privateEnvironment &&
    publicEnvironment &&
    privateEnvironment !== publicEnvironment
  ) {
    throw new Error(
      `APP_ENV (${privateEnvironment}) and NEXT_PUBLIC_APP_ENV (${publicEnvironment}) must match.`
    );
  }

  const configuredEnvironment = privateEnvironment ?? publicEnvironment;
  const vercelEnvironment = inferVercelEnvironment(values);

  if (
    configuredEnvironment &&
    vercelEnvironment &&
    configuredEnvironment !== vercelEnvironment
  ) {
    throw new Error(
      `Configured environment "${configuredEnvironment}" conflicts with Vercel environment "${vercelEnvironment}".`
    );
  }

  return (
    configuredEnvironment ??
    vercelEnvironment ??
    (values.NODE_ENV === "test" ? "test" : "local")
  );
}

export function assertEnvironmentIsolation(
  values: EnvironmentVariables = process.env
): EnvironmentIsolationSummary {
  const environment = resolveDeploymentEnvironment(values);

  if (environment === "staging") {
    assertStagingIsolation(values);
  }

  if (environment === "production") {
    assertProductionIsolation(values);
  }

  const communicationsMode =
    clean(values.EXTERNAL_COMMUNICATIONS_MODE) === "enabled" ? "enabled" : "blocked";

  return {
    environment,
    databaseEnvironment: clean(values.DATABASE_ENVIRONMENT),
    storageEnvironment: clean(values.STORAGE_ENVIRONMENT),
    externalCommunicationsMode: communicationsMode,
    analyticsEnabled: Boolean(
      clean(values.NEXT_PUBLIC_GA_ID) || clean(values.NEXT_PUBLIC_META_PIXEL_ID)
    ),
    blobStorageConfigured: Boolean(resolveBlobReadWriteToken(values))
  };
}

export function isStagingEnvironment(values: EnvironmentVariables = process.env) {
  return resolveDeploymentEnvironment(values) === "staging";
}

export function areExternalCommunicationsBlocked(
  values: EnvironmentVariables = process.env
) {
  return (
    resolveDeploymentEnvironment(values) !== "production" ||
    clean(values.EXTERNAL_COMMUNICATIONS_MODE) !== "enabled"
  );
}
