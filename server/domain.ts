export const kycStatuses = ["pending", "approved", "rejected"] as const;
export type KycStatus = (typeof kycStatuses)[number];

export const refundStatuses = ["pending", "approved", "rejected"] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const riskLevels = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const featureFlagEnvironments = [
  "development",
  "staging",
  "production"
] as const;
export type FeatureFlagEnvironment = (typeof featureFlagEnvironments)[number];

export type FeatureFlagState = "enabled" | "disabled";
export type AuditEntityType =
  | "kyc_case"
  | "refund_request"
  | "feature_flag";
export type AuditedState = KycStatus | RefundStatus | FeatureFlagState;

export interface KycCase {
  id: string;
  customerId: string;
  customerName: string;
  risk: RiskLevel;
  submittedAt: string;
  status: KycStatus;
  version: number;
}

export interface AuditEvent {
  id: number;
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  oldStatus: AuditedState | null;
  newStatus: AuditedState;
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
