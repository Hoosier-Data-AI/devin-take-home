export const kycStatuses = ["pending", "approved", "rejected"] as const;
export type KycStatus = (typeof kycStatuses)[number];

export const riskLevels = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof riskLevels)[number];

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
  entityType: "kyc_case";
  entityId: string;
  action: string;
  oldStatus: KycStatus | null;
  newStatus: KycStatus;
  reason: string;
  createdAt: string;
}

export interface KycCaseDetail extends KycCase {
  auditEvents: AuditEvent[];
}
