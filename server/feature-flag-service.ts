import type { AuditWriter } from "./audit.js";
import {
  insertAuditEvent,
  listAuditEvents
} from "./audit.js";
import type {
  FeatureFlag,
  FeatureFlagDetail,
  FeatureFlagEnvironment,
  FeatureFlagState
} from "./domain.js";
import type { WorkbenchDatabase } from "./database.js";
import { ConflictError, NotFoundError } from "./errors.js";

interface FeatureFlagRow {
  id: string;
  flag_key: string;
  description: string;
  owner: string;
  environment: FeatureFlagEnvironment;
  enabled: number;
  updated_at: string;
  version: number;
}

export interface FeatureFlagFilters {
  environment?: FeatureFlagEnvironment | undefined;
  state?: FeatureFlagState | undefined;
}

export interface FeatureFlagToggleInput {
  flagId: string;
  actorId: string;
  enabled: boolean;
  reason: string;
  expectedVersion: number;
}

function mapFeatureFlag(row: FeatureFlagRow): FeatureFlag {
  return {
    id: row.id,
    key: row.flag_key,
    description: row.description,
    owner: row.owner,
    environment: row.environment,
    enabled: row.enabled === 1,
    updatedAt: row.updated_at,
    version: row.version
  };
}

function stateFor(enabled: boolean): FeatureFlagState {
  return enabled ? "enabled" : "disabled";
}

export function listFeatureFlags(
  database: WorkbenchDatabase,
  filters: FeatureFlagFilters
): FeatureFlag[] {
  const clauses: string[] = [];
  const parameters: Array<string | number> = [];

  if (filters.environment) {
    clauses.push("environment = ?");
    parameters.push(filters.environment);
  }
  if (filters.state) {
    clauses.push("enabled = ?");
    parameters.push(filters.state === "enabled" ? 1 : 0);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = database
    .prepare(`
      SELECT
        id,
        flag_key,
        description,
        owner,
        environment,
        enabled,
        updated_at,
        version
      FROM feature_flags
      ${where}
      ORDER BY
        CASE environment
          WHEN 'production' THEN 1
          WHEN 'staging' THEN 2
          ELSE 3
        END,
        flag_key
    `)
    .all(...parameters) as FeatureFlagRow[];

  return rows.map(mapFeatureFlag);
}

export function getFeatureFlag(
  database: WorkbenchDatabase,
  flagId: string
): FeatureFlagDetail {
  const row = database
    .prepare(`
      SELECT
        id,
        flag_key,
        description,
        owner,
        environment,
        enabled,
        updated_at,
        version
      FROM feature_flags
      WHERE id = ?
    `)
    .get(flagId) as FeatureFlagRow | undefined;

  if (!row) {
    throw new NotFoundError(`Feature flag ${flagId} was not found.`);
  }

  return {
    ...mapFeatureFlag(row),
    auditEvents: listAuditEvents(database, "feature_flag", flagId)
  };
}

export function toggleFeatureFlag(
  database: WorkbenchDatabase,
  input: FeatureFlagToggleInput,
  auditWriter: AuditWriter = insertAuditEvent
): FeatureFlagDetail {
  const reason = input.reason.trim();
  const toggle = database.transaction(() => {
    const current = database
      .prepare("SELECT enabled, version FROM feature_flags WHERE id = ?")
      .get(input.flagId) as
      | { enabled: number; version: number }
      | undefined;

    if (!current) {
      throw new NotFoundError(`Feature flag ${input.flagId} was not found.`);
    }

    const currentlyEnabled = current.enabled === 1;
    if (currentlyEnabled === input.enabled) {
      throw new ConflictError(
        `Feature flag ${input.flagId} is already ${stateFor(input.enabled)}.`
      );
    }

    const updatedAt = new Date().toISOString();
    const result = database
      .prepare(`
        UPDATE feature_flags
        SET enabled = ?, updated_at = ?, version = version + 1
        WHERE id = ? AND enabled = ? AND version = ?
      `)
      .run(
        input.enabled ? 1 : 0,
        updatedAt,
        input.flagId,
        current.enabled,
        input.expectedVersion
      );

    if (result.changes !== 1) {
      throw new ConflictError(
        `Feature flag ${input.flagId} changed after it was loaded. Refresh and review the latest state.`
      );
    }

    auditWriter(database, {
      actorId: input.actorId,
      entityType: "feature_flag",
      entityId: input.flagId,
      action: `feature_flag.${stateFor(input.enabled)}`,
      oldStatus: stateFor(currentlyEnabled),
      newStatus: stateFor(input.enabled),
      reason,
      createdAt: updatedAt
    });
  });

  toggle();
  return getFeatureFlag(database, input.flagId);
}
