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

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    reason: row.reason,
    createdAt: row.created_at
  };
}

export interface AuditFeedFilters {
  entityType?: AuditEntityType | undefined;
  actorId?: string | undefined;
  limit?: number | undefined;
}

export function listAuditFeed(
  database: WorkbenchDatabase,
  filters: AuditFeedFilters = {}
): AuditEvent[] {
  const clauses: string[] = [];
  const parameters: Array<string | number> = [];

  if (filters.entityType) {
    clauses.push("entity_type = ?");
    parameters.push(filters.entityType);
  }
  if (filters.actorId) {
    clauses.push("actor_id = ?");
    parameters.push(filters.actorId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
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
      ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `)
    .all(...parameters, filters.limit ?? 50) as AuditEventRow[];

  return rows.map(mapAuditEvent);
}

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

  return rows.map(mapAuditEvent);
}
