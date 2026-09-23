import type { AuditWriter } from "./audit.js";
import {
  insertAuditEvent,
  listAuditEvents
} from "./audit.js";
import type {
  KycCase,
  KycCaseDetail,
  KycStatus,
  RiskLevel
} from "./domain.js";
import type { WorkbenchDatabase } from "./database.js";
import { ConflictError, NotFoundError } from "./errors.js";
import { assertAllowedKycTransition } from "./policies.js";

interface KycCaseRow {
  id: string;
  customer_id: string;
  customer_name: string;
  risk: RiskLevel;
  submitted_at: string;
  status: KycStatus;
  version: number;
}

export interface QueueFilters {
  status?: KycStatus | undefined;
  risk?: RiskLevel | undefined;
}

export interface DecisionInput {
  caseId: string;
  actorId: string;
  decision: "approved" | "rejected";
  reason: string;
  expectedVersion: number;
}

function mapCase(row: KycCaseRow): KycCase {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    risk: row.risk,
    submittedAt: row.submitted_at,
    status: row.status,
    version: row.version
  };
}

export function listKycCases(
  database: WorkbenchDatabase,
  filters: QueueFilters
): KycCase[] {
  const clauses: string[] = [];
  const parameters: string[] = [];

  if (filters.status) {
    clauses.push("status = ?");
    parameters.push(filters.status);
  }
  if (filters.risk) {
    clauses.push("risk = ?");
    parameters.push(filters.risk);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = database
    .prepare(`
      SELECT id, customer_id, customer_name, risk, submitted_at, status, version
      FROM kyc_cases
      ${where}
      ORDER BY
        CASE risk WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        submitted_at DESC
    `)
    .all(...parameters) as KycCaseRow[];

  return rows.map(mapCase);
}

export function getKycCase(
  database: WorkbenchDatabase,
  caseId: string
): KycCaseDetail {
  const row = database
    .prepare(`
      SELECT id, customer_id, customer_name, risk, submitted_at, status, version
      FROM kyc_cases
      WHERE id = ?
    `)
    .get(caseId) as KycCaseRow | undefined;

  if (!row) {
    throw new NotFoundError(`KYC case ${caseId} was not found.`);
  }

  return {
    ...mapCase(row),
    auditEvents: listAuditEvents(database, "kyc_case", caseId)
  };
}

export function decideKycCase(
  database: WorkbenchDatabase,
  input: DecisionInput,
  auditWriter: AuditWriter = insertAuditEvent
): KycCaseDetail {
  const reason = input.reason.trim();
  const decide = database.transaction(() => {
    const current = database
      .prepare("SELECT status, version FROM kyc_cases WHERE id = ?")
      .get(input.caseId) as
      | { status: KycStatus; version: number }
      | undefined;

    if (!current) {
      throw new NotFoundError(`KYC case ${input.caseId} was not found.`);
    }

    assertAllowedKycTransition(current.status, input.decision);

    const result = database
      .prepare(`
        UPDATE kyc_cases
        SET status = ?, version = version + 1
        WHERE id = ? AND status = 'pending' AND version = ?
      `)
      .run(input.decision, input.caseId, input.expectedVersion);

    if (result.changes !== 1) {
      throw new ConflictError(
        `KYC case ${input.caseId} changed after it was loaded. Refresh and review the latest state.`
      );
    }

    auditWriter(database, {
      actorId: input.actorId,
      entityType: "kyc_case",
      entityId: input.caseId,
      action: `kyc.case.${input.decision}`,
      oldStatus: current.status,
      newStatus: input.decision,
      reason,
      createdAt: new Date().toISOString()
    });
  });

  decide();
  return getKycCase(database, input.caseId);
}
