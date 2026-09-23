import { runPlatformGovernanceChecks } from "../platform-governance.js";
import { findRepositoryRoot } from "../repository-root.js";

const report = runPlatformGovernanceChecks(findRepositoryRoot());

for (const check of report.checks) {
  const result = check.passed ? "PASS" : "FAIL";
  console.log(
    `${result} ${check.applicationId}: ${check.name} (${check.detail})`
  );
}

if (!report.passed) {
  process.exitCode = 1;
}
