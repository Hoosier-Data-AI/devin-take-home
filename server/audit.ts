import type {
  AuditEvent,
  AuditedState,
  AuditEntityType
} from "./domain.js";
import type { WorkbenchDatabase } from "./database.js";

export interface NewAuditEvent {
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  oldStatus: AuditedState;
  newStatus: AuditedState;
  reason: string;
  createdAt: string;
}

export type AuditWriter = (
  database: WorkbenchDatabase,
  event: NewAuditEvent
) => void;

interface AuditEventRow {
  id: number;
  actor_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: string;
  old_status: AuditedState | null;
  new_status: AuditedState;
  reason: string;
  created_at: string;
}

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

export function listAuditEvents(
  database: WorkbenchDatabase,
  entityType: AuditEntityType,
  entityId: string
): AuditEvent[] {
  const rows = database
    .prepare(`
      SELECT
        id,
        actor_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        reason,
        created_at
      FROM audit_events
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY id DESC
    `)
    .all(entityType, entityId) as AuditEventRow[];

  return rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    reason: row.reason,
    createdAt: row.created_at
  }));
}
