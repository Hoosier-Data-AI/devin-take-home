import { resolve } from "node:path";
import { runPlatformGovernanceChecks } from "../platform-governance.js";

const report = runPlatformGovernanceChecks(resolve("."));

for (const check of report.checks) {
  const result = check.passed ? "PASS" : "FAIL";
  console.log(
    `${result} ${check.applicationId}: ${check.name} (${check.detail})`
  );
}

if (!report.passed) {
  process.exitCode = 1;
}
