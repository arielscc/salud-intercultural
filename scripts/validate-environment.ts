import { assertEnvironmentIsolation } from "../src/lib/deployment-environment";

const expectedArgumentIndex = process.argv.indexOf("--expect");
const expectedEnvironment =
  expectedArgumentIndex >= 0 ? process.argv[expectedArgumentIndex + 1] : undefined;
const summary = assertEnvironmentIsolation();

if (expectedEnvironment && summary.environment !== expectedEnvironment) {
  throw new Error(
    `Expected environment "${expectedEnvironment}", received "${summary.environment}".`
  );
}

console.log(
  [
    `Environment validated: ${summary.environment}`,
    `database=${summary.databaseEnvironment ?? "not-labeled"}`,
    `storage=${summary.storageEnvironment ?? "not-labeled"}`,
    `clinical-files=${summary.clinicalStorageDriver}`,
    `communications=${summary.externalCommunicationsMode}`,
    `analytics=${summary.analyticsEnabled ? "configured" : "disabled"}`,
    `blob=${summary.blobStorageConfigured ? "configured" : "disabled"}`
  ].join(" | ")
);
