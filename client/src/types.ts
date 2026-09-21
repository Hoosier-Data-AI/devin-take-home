export type KycStatus = "pending" | "approved" | "rejected";
export type RiskLevel = "low" | "medium" | "high";

export interface DemoPersona {
  id: string;
  label: string;
  personaType: "viewer" | "kyc_reviewer" | "refund_reviewer";
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

export interface AuditEvent {
  id: number;
  actorId: string;
  action: string;
  oldStatus: KycStatus | null;
  newStatus: KycStatus;
  reason: string;
  createdAt: string;
}

export interface KycCaseDetail extends KycCase {
  auditEvents: AuditEvent[];
}
