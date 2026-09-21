import type { AuditWriter } from "./audit.js";
import {
  insertAuditEvent,
  listAuditEvents
} from "./audit.js";
import type {
  RefundRequest,
  RefundRequestDetail,
  RefundStatus,
  RiskLevel
} from "./domain.js";
import type { WorkbenchDatabase } from "./database.js";
import { ConflictError, NotFoundError } from "./errors.js";
import { assertAllowedRefundTransition } from "./policies.js";

interface RefundRequestRow {
  id: string;
  customer_id: string;
  customer_name: string;
  amount_cents: number;
  currency: "USD";
  category: RefundRequest["category"];
  risk: RiskLevel;
  submitted_at: string;
  status: RefundStatus;
  version: number;
}

export interface RefundQueueFilters {
  status?: RefundStatus | undefined;
  risk?: RiskLevel | undefined;
}

export interface RefundDecisionInput {
  refundId: string;
  actorId: string;
  decision: "approved" | "rejected";
  reason: string;
  expectedVersion: number;
}

function mapRefund(row: RefundRequestRow): RefundRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    risk: row.risk,
    submittedAt: row.submitted_at,
    status: row.status,
    version: row.version
  };
}

export function listRefundRequests(
  database: WorkbenchDatabase,
  filters: RefundQueueFilters
): RefundRequest[] {
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
      SELECT
        id,
        customer_id,
        customer_name,
        amount_cents,
        currency,
        category,
        risk,
        submitted_at,
        status,
        version
      FROM refund_requests
      ${where}
      ORDER BY
        CASE risk WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        amount_cents DESC,
        submitted_at DESC
    `)
    .all(...parameters) as RefundRequestRow[];

  return rows.map(mapRefund);
}

export function getRefundRequest(
  database: WorkbenchDatabase,
  refundId: string
): RefundRequestDetail {
  const row = database
    .prepare(`
      SELECT
        id,
        customer_id,
        customer_name,
        amount_cents,
        currency,
        category,
        risk,
        submitted_at,
        status,
        version
      FROM refund_requests
      WHERE id = ?
    `)
    .get(refundId) as RefundRequestRow | undefined;

  if (!row) {
    throw new NotFoundError(`Refund request ${refundId} was not found.`);
  }

  return {
    ...mapRefund(row),
    auditEvents: listAuditEvents(database, "refund_request", refundId)
  };
}

export function decideRefundRequest(
  database: WorkbenchDatabase,
  input: RefundDecisionInput,
  auditWriter: AuditWriter = insertAuditEvent
): RefundRequestDetail {
  const reason = input.reason.trim();
  const decide = database.transaction(() => {
    const current = database
      .prepare("SELECT status, version FROM refund_requests WHERE id = ?")
      .get(input.refundId) as
      | { status: RefundStatus; version: number }
      | undefined;

    if (!current) {
      throw new NotFoundError(
        `Refund request ${input.refundId} was not found.`
      );
    }

    assertAllowedRefundTransition(current.status, input.decision);

    const result = database
      .prepare(`
        UPDATE refund_requests
        SET status = ?, version = version + 1
        WHERE id = ? AND status = 'pending' AND version = ?
      `)
      .run(input.decision, input.refundId, input.expectedVersion);

    if (result.changes !== 1) {
      throw new ConflictError(
        `Refund request ${input.refundId} changed after it was loaded. Refresh and review the latest state.`
      );
    }

    auditWriter(database, {
      actorId: input.actorId,
      entityType: "refund_request",
      entityId: input.refundId,
      action: `refund.request.${input.decision}`,
      oldStatus: current.status,
      newStatus: input.decision,
      reason,
      createdAt: new Date().toISOString()
    });
  });

  decide();
  return getRefundRequest(database, input.refundId);
}
