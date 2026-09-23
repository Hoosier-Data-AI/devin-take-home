export type KycStatus = "pending" | "approved" | "rejected";
export type RefundStatus = "pending" | "approved" | "rejected";
export type RiskLevel = "low" | "medium" | "high";
export type FeatureFlagEnvironment = "development" | "staging" | "production";
export type FeatureFlagState = "enabled" | "disabled";

export interface DemoPersona {
  id: string;
  label: string;
  personaType:
    | "viewer"
    | "kyc_reviewer"
    | "refund_reviewer"
    | "feature_flag_admin"
    | "platform_admin";
  permissions: string[];
}

export interface KycCase {
  id: string;
  customerId: string;
  customerName: string;
  risk: RiskLevel;
  submittedAt: string;
  status: KycStatus;
  version: number;
}

export type AuditEntityType = "kyc_case" | "refund_request" | "feature_flag";

export interface AuditEvent {
  id: number;
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  oldStatus: KycStatus | RefundStatus | FeatureFlagState | null;
  newStatus: KycStatus | RefundStatus | FeatureFlagState;
  reason: string;
  createdAt: string;
}

export interface KycCaseDetail extends KycCase {
  auditEvents: AuditEvent[];
}

export interface RefundRequest {
  id: string;
  customerId: string;
  customerName: string;
  amountCents: number;
  currency: "USD";
  category: "duplicate_charge" | "service_issue" | "fraud_claim";
  risk: RiskLevel;
  submittedAt: string;
  status: RefundStatus;
  version: number;
}

export interface RefundRequestDetail extends RefundRequest {
  auditEvents: AuditEvent[];
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  owner: string;
  environment: FeatureFlagEnvironment;
  enabled: boolean;
  updatedAt: string;
  version: number;
}

export interface FeatureFlagDetail extends FeatureFlag {
  auditEvents: AuditEvent[];
}

export interface PlatformApplication {
  id: string;
  name: string;
  owner: string;
  description: string;
  riskTier: "standard" | "elevated" | "critical";
  dataClassification: "internal" | "restricted";
  status: "prototype";
  permissions: string[];
}

export interface PlatformOverview {
  applications: PlatformApplication[];
  personas: DemoPersona[];
  sharedControls: string[];
  extensionSteps: string[];
  connectors: Array<{
    id: string;
    name: string;
    owner: string;
    mode: "synthetic-contract";
    status: "contract-verified";
    direction: "read-only";
    contractPath: string;
    controls: string[];
  }>;
  accelerator: {
    scaffoldCommand: string;
    generatedFiles: string[];
    governanceCommand: string;
    passingChecks: number;
    totalChecks: number;
    passed: boolean;
  };
}
