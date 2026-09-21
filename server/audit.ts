import type { KycStatus } from "./domain.js";
import type { WorkbenchDatabase } from "./database.js";

export interface NewAuditEvent {
  actorId: string;
  entityType: "kyc_case";
  entityId: string;
  action: string;
  oldStatus: KycStatus;
  newStatus: KycStatus;
  reason: string;
  createdAt: string;
}

export type AuditWriter = (
  database: WorkbenchDatabase,
  event: NewAuditEvent
) => void;

export const insertAuditEvent: AuditWriter = (database, event) => {
  database
    .prepare(`
      INSERT INTO audit_events (
        actor_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        reason,
        created_at
      ) VALUES (
        @actorId,
        @entityType,
        @entityId,
        @action,
        @oldStatus,
        @newStatus,
        @reason,
        @createdAt
      )
    `)
    .run(event);
};
