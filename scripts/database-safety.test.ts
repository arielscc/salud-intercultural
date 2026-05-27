import { describe, expect, it, vi } from "vitest";
import { assertSafeDatabaseCommand } from "./database-safety";

const localTestUrl =
  "postgresql://salud_intercultural:salud_intercultural@localhost:5432/salud_intercultural_test?schema=public";

describe("assertSafeDatabaseCommand", () => {
  it("allows an approved local database", () => {
    expect(() =>
      assertSafeDatabaseCommand({
        allowedDatabaseNames: ["salud_intercultural_test"],
        commandName: "test command",
        databaseUrl: localTestUrl,
        requireLocalHost: true
      })
    ).not.toThrow();
  });

  it("blocks managed remote database hosts", () => {
    expect(() =>
      assertSafeDatabaseCommand({
        commandName: "test command",
        databaseUrl: "postgresql://user:pass@ep-test.us-east-1.aws.neon.tech/database?sslmode=require",
        requireLocalHost: true
      })
    ).toThrow(/looks remote or managed/);
  });

  it("blocks protected public site URLs", () => {
    expect(() =>
      assertSafeDatabaseCommand({
        commandName: "test command",
        databaseUrl: localTestUrl,
        nextPublicSiteUrl: "https://staging.saludintercultural.com",
        requireLocalHost: true
      })
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("blocks staging and production database names", () => {
    expect(() =>
      assertSafeDatabaseCommand({
        commandName: "test command",
        databaseUrl: "postgresql://user:pass@localhost:5432/salud_intercultural_production",
        requireLocalHost: true
      })
    ).toThrow(/staging or production/);
  });

  it("requires an explicit override for non-local hosts that are not otherwise blocked", () => {
    expect(() =>
      assertSafeDatabaseCommand({
        allowRemoteOverrideEnv: "ALLOW_REMOTE_DB_RESET",
        commandName: "test command",
        databaseUrl: "postgresql://user:pass@db.internal:5432/salud_intercultural_dev",
        requireLocalHost: true
      })
    ).toThrow(/not local/);
  });

  it("accepts the remote override only for non-protected hosts", () => {
    vi.stubEnv("ALLOW_REMOTE_DB_RESET", "true");

    expect(() =>
      assertSafeDatabaseCommand({
        allowRemoteOverrideEnv: "ALLOW_REMOTE_DB_RESET",
        commandName: "test command",
        databaseUrl: "postgresql://user:pass@db.internal:5432/salud_intercultural_dev",
        requireLocalHost: true
      })
    ).not.toThrow();

    vi.unstubAllEnvs();
  });
});
