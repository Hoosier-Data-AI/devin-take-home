import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runPlatformGovernanceChecks } from "../server/platform-governance.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("platform governance checks", () => {
  it("passes for every registered application in the repository", () => {
    const report = runPlatformGovernanceChecks(resolve("."));

    expect(report.passed).toBe(true);
    expect(report.checks).toHaveLength(25);
  });

  it("reports missing implementation controls", () => {
    const emptyRepository = mkdtempSync(
      join(tmpdir(), "workbench-governance-")
    );
    temporaryDirectories.push(emptyRepository);

    const report = runPlatformGovernanceChecks(emptyRepository);

    expect(report.passed).toBe(false);
    expect(report.checks).toContainEqual({
      applicationId: "kyc",
      name: "Domain service exists",
      passed: false,
      detail: "server/kyc-service.ts"
    });
    expect(report.checks).toContainEqual({
      applicationId: "feature-flags",
      name: "Route enforces feature_flag:manage",
      passed: false,
      detail: "server/app.ts"
    });
  });
});
