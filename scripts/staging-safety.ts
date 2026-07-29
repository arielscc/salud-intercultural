import {
  assertEnvironmentIsolation,
  type EnvironmentVariables
} from "../src/lib/deployment-environment";

export const stagingResetConfirmation = "RESET-SIGECO-STAGING";

export function assertSafeStagingCommand(
  commandName: string,
  options: {
    destructive?: boolean;
    values?: EnvironmentVariables;
  } = {}
) {
  const values = options.values ?? process.env;
  const summary = assertEnvironmentIsolation(values);

  if (summary.environment !== "staging") {
    throw new Error(`${commandName} only runs when APP_ENV and NEXT_PUBLIC_APP_ENV are staging.`);
  }

  if (
    options.destructive &&
    values.CONFIRM_STAGING_RESET !== stagingResetConfirmation
  ) {
    throw new Error(
      `${commandName} is destructive. Set CONFIRM_STAGING_RESET=${stagingResetConfirmation} after verifying the target resources.`
    );
  }

  return summary;
}
