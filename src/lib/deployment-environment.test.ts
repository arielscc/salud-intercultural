import { describe, expect, it } from "vitest";
import {
  areExternalCommunicationsBlocked,
  assertEnvironmentIsolation,
  resolveBlobReadWriteToken,
  resolveClinicalAttachmentStorage,
  resolveDeploymentEnvironment,
  resolvePayloadSecret
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
  PAYLOAD_SECRET: "staging-payload-secret-32-characters-minimum",
  STAGING_BLOB_READ_WRITE_TOKEN: "synthetic-staging-token",
  CLINICAL_FILES_STORAGE_DRIVER: "vercel-blob",
  STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN: "synthetic-private-clinical-token",
  NEXT_PUBLIC_GA_ID: "",
  NEXT_PUBLIC_META_PIXEL_ID: "",
  GOOGLE_SITE_VERIFICATION: ""
};

const productionEnvironment = {
  APP_ENV: "production",
  NEXT_PUBLIC_APP_ENV: "production",
  DATABASE_ENVIRONMENT: "production",
  STORAGE_ENVIRONMENT: "production",
  EXTERNAL_COMMUNICATIONS_MODE: "enabled",
  NEXT_PUBLIC_SITE_URL: "https://saludintercultural.com",
  PAYLOAD_PUBLIC_SERVER_URL: "https://saludintercultural.com",
  DATABASE_URL: "postgresql://production_user:secret@db.example.net/salud_intercultural",
  PAYLOAD_DB_SCHEMA: "payload",
  PAYLOAD_SECRET: "production-payload-secret-32-characters-minimum",
  BLOB_READ_WRITE_TOKEN: "synthetic-production-editorial-token",
  CLINICAL_FILES_STORAGE_DRIVER: "vercel-blob",
  CLINICAL_BLOB_READ_WRITE_TOKEN: "synthetic-production-clinical-token",
  CASH_CLOSE_APPROVAL_THRESHOLD_CENTS: "2000"
};

describe("deployment environment isolation", () => {
  it("accepts a fully isolated staging configuration", () => {
    expect(assertEnvironmentIsolation(stagingEnvironment)).toMatchObject({
      environment: "staging",
      databaseEnvironment: "staging",
      storageEnvironment: "staging",
      clinicalStorageDriver: "vercel-blob",
      externalCommunicationsMode: "blocked",
      analyticsEnabled: false,
      blobStorageConfigured: true
    });
  });

  it("keeps clinical files local outside deployments and private in staging", () => {
    expect(
      resolveClinicalAttachmentStorage({
        APP_ENV: "local",
        CLINICAL_FILES_LOCAL_PATH: ".data/private-test"
      })
    ).toEqual({
      driver: "local",
      rootPath: ".data/private-test"
    });
    expect(resolveClinicalAttachmentStorage(stagingEnvironment)).toEqual({
      driver: "vercel-blob",
      token: "synthetic-private-clinical-token"
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
    [
      "missing private clinical Blob token",
      { STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN: "" }
    ],
    [
      "shared editorial and clinical Blob token",
      {
        STAGING_CLINICAL_BLOB_READ_WRITE_TOKEN:
          stagingEnvironment.STAGING_BLOB_READ_WRITE_TOKEN
      }
    ],
    ["local clinical storage", { CLINICAL_FILES_STORAGE_DRIVER: "local" }],
    ["missing Payload secret", { PAYLOAD_SECRET: "" }],
    ["short Payload secret", { PAYLOAD_SECRET: "too-short" }],
    ["placeholder Payload secret", { PAYLOAD_SECRET: "development-secret-that-is-long-enough" }],
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

  it("uses a local fallback only outside staging and production", () => {
    expect(
      resolvePayloadSecret({
        APP_ENV: "local",
        NEXT_PUBLIC_APP_ENV: "local"
      })
    ).toBe("development-payload-secret");

    expect(() =>
      resolvePayloadSecret({
        ...stagingEnvironment,
        PAYLOAD_SECRET: ""
      })
    ).toThrow(/32 characters/);
  });

  it("blocks production until the consent text version is explicitly approved", () => {
    expect(() => assertEnvironmentIsolation(productionEnvironment)).toThrow(
      /PATIENT_CONSENT_PRODUCTION_TEXT_VERSION/
    );
    expect(
      assertEnvironmentIsolation({
        ...productionEnvironment,
        PATIENT_CONSENT_PRODUCTION_TEXT_VERSION: "v1"
      }).environment
    ).toBe("production");
  });

  it("blocks production until Direction defines the cash difference limit", () => {
    expect(() =>
      assertEnvironmentIsolation({
        ...productionEnvironment,
        PATIENT_CONSENT_PRODUCTION_TEXT_VERSION: "v1",
        CASH_CLOSE_APPROVAL_THRESHOLD_CENTS: ""
      })
    ).toThrow(/CASH_CLOSE_APPROVAL_THRESHOLD_CENTS/);
  });
});
