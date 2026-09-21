import { listDemoPersonas } from "./personas.js";

const applications = [
  {
    id: "kyc",
    name: "KYC review",
    owner: "Identity Operations",
    description: "Review synthetic identity cases and record decisions.",
    riskTier: "elevated",
    dataClassification: "restricted",
    status: "prototype",
    permissions: ["kyc:read", "kyc:decide"]
  },
  {
    id: "refunds",
    name: "Refunds dashboard",
    owner: "Payment Operations",
    description: "Review synthetic refund requests and record decisions.",
    riskTier: "elevated",
    dataClassification: "restricted",
    status: "prototype",
    permissions: ["refund:read", "refund:decide"]
  },
  {
    id: "feature-flags",
    name: "Feature-flag admin",
    owner: "Release Engineering",
    description: "Manage local synthetic feature flags with versioned changes.",
    riskTier: "critical",
    dataClassification: "internal",
    status: "prototype",
    permissions: ["feature_flag:read", "feature_flag:manage"]
  }
] as const;

export function getPlatformOverview() {
  return {
    applications,
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
