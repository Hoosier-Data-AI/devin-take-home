import { connectorDefinitions } from "./customer-profile-connector.js";
import { listDemoPersonas, type Permission } from "./personas.js";

export interface PlatformApplicationDefinition {
  id: string;
  name: string;
  owner: string;
  description: string;
  riskTier: "standard" | "elevated" | "critical";
  dataClassification: "internal" | "restricted";
  status: "prototype";
  permissions: readonly Permission[];
  implementation: {
    service: string;
    workspace: string;
    apiTest: string;
  };
}

export const applicationDefinitions = [
  {
    id: "kyc",
    name: "KYC review",
    owner: "Identity Operations",
    description: "Review synthetic identity cases and record decisions.",
    riskTier: "elevated",
    dataClassification: "restricted",
    status: "prototype",
    permissions: ["kyc:read", "kyc:decide"],
    implementation: {
      service: "server/kyc-service.ts",
      workspace: "client/src/modules/KycWorkspace.tsx",
      apiTest: "tests/kyc-api.test.ts"
    }
  },
  {
    id: "refunds",
    name: "Refunds dashboard",
    owner: "Payment Operations",
    description: "Review synthetic refund requests and record decisions.",
    riskTier: "elevated",
    dataClassification: "restricted",
    status: "prototype",
    permissions: ["refund:read", "refund:decide"],
    implementation: {
      service: "server/refund-service.ts",
      workspace: "client/src/modules/RefundsWorkspace.tsx",
      apiTest: "tests/refund-api.test.ts"
    }
  },
  {
    id: "feature-flags",
    name: "Feature-flag admin",
    owner: "Release Engineering",
    description: "Manage local synthetic feature flags with versioned changes.",
    riskTier: "critical",
    dataClassification: "internal",
    status: "prototype",
    permissions: ["feature_flag:read", "feature_flag:manage"],
    implementation: {
      service: "server/feature-flag-service.ts",
      workspace: "client/src/modules/FeatureFlagsWorkspace.tsx",
      apiTest: "tests/feature-flags-api.test.ts"
    }
  }
] as const satisfies readonly PlatformApplicationDefinition[];

export function getPlatformOverview() {
  return {
    applications: applicationDefinitions.map(
      ({ implementation: _implementation, ...application }) => application
    ),
    connectors: connectorDefinitions,
    personas: listDemoPersonas(),
    sharedControls: [
      "Server-owned authorization",
      "Strict request validation",
      "Optimistic concurrency",
      "Atomic state and audit writes",
      "Append-only audit history",
      "Production-mode refusal"
    ],
    extensionSteps: [
      "Define domain tables and synthetic seeds",
      "Add explicit read and write permissions",
      "Implement service, validation, and routes",
      "Reuse queue, badges, and audit components",
      "Test authorization, concurrency, and rollback",
      "Register the application in this catalog"
    ]
  };
}
