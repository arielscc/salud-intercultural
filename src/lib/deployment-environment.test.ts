import { describe, expect, it } from "vitest";
import {
  areExternalCommunicationsBlocked,
  assertEnvironmentIsolation,
  resolveBlobReadWriteToken,
  resolveDeploymentEnvironment
} from "@/lib/deployment-environment";

const stagingEnvironment = {
  APP_ENV: "staging",
  NEXT_PUBLIC_APP_ENV: "staging",
  DATABASE_ENVIRONMENT: "staging",
  STORAGE_ENVIRONMENT: "staging",
  EXTERNAL_COMMUNICATIONS_MODE: "blocked",
  NEXT_PUBLIC_SITE_URL: "https://staging.saludintercultural.com",
  PAYLOAD_PUBLIC_SERVER_URL: "https://staging.saludintercultural.com",
  DATABASE_URL: "postgresql://staging_user:secret@db.example.net/salud_intercultural_staging",
  PAYLOAD_DB_SCHEMA: "payload_staging",
  STAGING_BLOB_READ_WRITE_TOKEN: "synthetic-staging-token",
  NEXT_PUBLIC_GA_ID: "",
  NEXT_PUBLIC_META_PIXEL_ID: "",
  GOOGLE_SITE_VERIFICATION: ""
};

describe("deployment environment isolation", () => {
  it("accepts a fully isolated staging configuration", () => {
    expect(assertEnvironmentIsolation(stagingEnvironment)).toMatchObject({
      environment: "staging",
      databaseEnvironment: "staging",
      storageEnvironment: "staging",
      externalCommunicationsMode: "blocked",
      analyticsEnabled: false,
      blobStorageConfigured: true
    });
  });

  it("selects the staging Blob token even when a production token is present", () => {
    expect(
      resolveBlobReadWriteToken({
        ...stagingEnvironment,
        BLOB_READ_WRITE_TOKEN: "production-token"
      })
    ).toBe("synthetic-staging-token");

    expect(
      resolveBlobReadWriteToken({
        APP_ENV: "production",
        NEXT_PUBLIC_APP_ENV: "production",
        BLOB_READ_WRITE_TOKEN: "production-token"
      })
    ).toBe("production-token");
  });

  it("infers staging only for the staging Vercel preview branch", () => {
    expect(
      resolveDeploymentEnvironment({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "staging"
      })
    ).toBe("staging");
    expect(
      resolveDeploymentEnvironment({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feature/example"
      })
    ).toBe("test");
  });

  it.each([
    ["production database", { DATABASE_URL: "postgresql://prod:secret@db/prod" }],
    ["production URL", { NEXT_PUBLIC_SITE_URL: "https://saludintercultural.com" }],
    ["shared Payload schema", { PAYLOAD_DB_SCHEMA: "payload" }],
    ["missing staging Blob token", { STAGING_BLOB_READ_WRITE_TOKEN: "" }],
    ["real communications", { EXTERNAL_COMMUNICATIONS_MODE: "enabled" }],
    ["production analytics", { NEXT_PUBLIC_GA_ID: "G-TEST123" }],
    ["wrong database marker", { DATABASE_ENVIRONMENT: "production" }]
  ])("rejects staging with %s", (_name, override) => {
    expect(() =>
      assertEnvironmentIsolation({ ...stagingEnvironment, ...override })
    ).toThrow();
  });

  it("rejects conflicting public and private environment labels", () => {
    expect(() =>
      resolveDeploymentEnvironment({
        APP_ENV: "staging",
        NEXT_PUBLIC_APP_ENV: "production"
      })
    ).toThrow(/must match/);
  });

  it("blocks external communications outside an explicit production environment", () => {
    expect(areExternalCommunicationsBlocked(stagingEnvironment)).toBe(true);
    expect(
      areExternalCommunicationsBlocked({
        APP_ENV: "production",
        NEXT_PUBLIC_APP_ENV: "production",
        EXTERNAL_COMMUNICATIONS_MODE: "enabled"
      })
    ).toBe(false);
  });
});
