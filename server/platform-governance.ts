import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefinitions } from "./platform-catalog.js";
import { listDemoPersonas } from "./personas.js";

export interface GovernanceCheck {
  applicationId: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface GovernanceReport {
  passed: boolean;
  checks: GovernanceCheck[];
}

function fileCheck(
  rootDirectory: string,
  applicationId: string,
  name: string,
  relativePath: string
): GovernanceCheck {
  return {
    applicationId,
    name,
    passed: existsSync(resolve(rootDirectory, relativePath)),
    detail: relativePath
  };
}

export function runPlatformGovernanceChecks(
  rootDirectory: string
): GovernanceReport {
  const appSourcePath = resolve(rootDirectory, "server/app.ts");
  const appSource = existsSync(appSourcePath)
    ? readFileSync(appSourcePath, "utf8")
    : "";
  const assignedPermissions = new Set(
    listDemoPersonas().flatMap((persona) => persona.permissions)
  );
  const checks: GovernanceCheck[] = [];

  for (const application of applicationDefinitions) {
    checks.push(
      fileCheck(
        rootDirectory,
        application.id,
        "Domain service exists",
        application.implementation.service
      ),
      fileCheck(
        rootDirectory,
        application.id,
        "Workspace exists",
        application.implementation.workspace
      ),
      fileCheck(
        rootDirectory,
        application.id,
        "API test exists",
        application.implementation.apiTest
      )
    );

    for (const permission of application.permissions) {
      checks.push({
        applicationId: application.id,
        name: `Route enforces ${permission}`,
        passed: appSource.includes(`"${permission}"`),
        detail: "server/app.ts"
      });
      checks.push({
        applicationId: application.id,
        name: `${permission} is assigned`,
        passed: assignedPermissions.has(permission),
        detail: "server/personas.ts"
      });
    }
  }

  checks.push(
    fileCheck(
      rootDirectory,
      "platform",
      "Application scaffolder exists",
      "server/app-scaffolder.ts"
    ),
    fileCheck(
      rootDirectory,
      "platform",
      "Scaffolder test exists",
      "tests/app-scaffolder.test.ts"
    ),
    fileCheck(
      rootDirectory,
      "platform",
      "Connector contract exists",
      "contracts/customer-profile.openapi.json"
    ),
    fileCheck(
      rootDirectory,
      "platform",
      "Connector contract test exists",
      "tests/customer-profile-connector.test.ts"
    )
  );

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}
