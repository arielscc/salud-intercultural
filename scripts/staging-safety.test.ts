import { describe, expect, it } from "vitest";
import {
  assertSafeStagingCommand,
  stagingResetConfirmation
} from "./staging-safety";

const safeStaging = {
  APP_ENV: "staging",
  NEXT_PUBLIC_APP_ENV: "staging",
  DATABASE_ENVIRONMENT: "staging",
  STORAGE_ENVIRONMENT: "staging",
  EXTERNAL_COMMUNICATIONS_MODE: "blocked",
  NEXT_PUBLIC_SITE_URL: "https://staging.saludintercultural.com",
  PAYLOAD_PUBLIC_SERVER_URL: "https://staging.saludintercultural.com",
  DATABASE_URL: "postgresql://staging:secret@db.example.net/sigeco_staging",
  PAYLOAD_DB_SCHEMA: "payload_staging",
  STAGING_BLOB_READ_WRITE_TOKEN: "synthetic-token"
};

describe("staging command safety", () => {
  it("allows non-destructive commands with isolated resources", () => {
    expect(
      assertSafeStagingCommand("staging:verify", { values: safeStaging })
    ).toMatchObject({ environment: "staging" });
  });

  it("requires an exact confirmation for destructive reset", () => {
    expect(() =>
      assertSafeStagingCommand("staging:reset", {
        destructive: true,
        values: safeStaging
      })
    ).toThrow(/CONFIRM_STAGING_RESET/);

    expect(() =>
      assertSafeStagingCommand("staging:reset", {
        destructive: true,
        values: {
          ...safeStaging,
          CONFIRM_STAGING_RESET: stagingResetConfirmation
        }
      })
    ).not.toThrow();
  });
});
