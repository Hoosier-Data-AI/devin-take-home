import Database from "better-sqlite3";
import { existsSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  openDatabase,
  resetDatabase,
  seedDatabase,
  type WorkbenchDatabase
} from "../server/database.js";
import { getKycCase } from "../server/kyc-service.js";

describe("database reset", () => {
  let database: WorkbenchDatabase;

  beforeEach(() => {
    database = openDatabase(":memory:");
    seedDatabase(database);
  });

  afterEach(() => {
    database.close();
  });

  it("rolls back deletions when replacement seeding fails", () => {
    database
      .prepare(
        "UPDATE kyc_cases SET status = 'approved', version = 2 WHERE id = 'KYC-1001'"
      )
      .run();
    database.exec(`
      CREATE TRIGGER fail_reset_seed
      BEFORE INSERT ON kyc_cases
      WHEN NEW.id = 'KYC-1005'
      BEGIN
        SELECT RAISE(ABORT, 'injected reset seed failure');
      END;
    `);

    expect(() => resetDatabase(database)).toThrow(
      "injected reset seed failure"
    );

    const row = database
      .prepare("SELECT COUNT(*) AS count FROM kyc_cases")
      .get() as { count: number };
    expect(row.count).toBe(12);
    expect(getKycCase(database, "KYC-1001")).toMatchObject({
      status: "approved",
      version: 2
    });
  });
});

describe("database migration", () => {
  it("preserves KYC audit history while widening the audit schema", () => {
    const databasePath = resolve(
      "data",
      `migration-test-${randomUUID()}.sqlite`
    );
    const legacyDatabase = new Database(databasePath);
    legacyDatabase.exec(`
      CREATE TABLE kyc_cases (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        risk TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        status TEXT NOT NULL,
        version INTEGER NOT NULL
      );

      CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type = 'kyc_case'),
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES kyc_cases(id)
      );

      INSERT INTO kyc_cases VALUES (
        'KYC-LEGACY',
        'SYN-LEGACY',
        'Legacy Sample',
        'low',
        '2026-09-01T00:00:00.000Z',
        'approved',
        2
      );

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
        'kyc-reviewer-001',
        'kyc_case',
        'KYC-LEGACY',
        'approve',
        'pending',
        'approved',
        'Legacy decision',
        '2026-09-01T00:05:00.000Z'
      );
    `);
    legacyDatabase.close();

    const migratedDatabase = openDatabase(databasePath);
    try {
      const history = migratedDatabase
        .prepare(
          "SELECT entity_type, entity_id, reason FROM audit_events WHERE id = 1"
        )
        .get();
      expect(history).toEqual({
        entity_type: "kyc_case",
        entity_id: "KYC-LEGACY",
        reason: "Legacy decision"
      });

      expect(() =>
        migratedDatabase
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            "feature-flag-admin-001",
            "feature_flag",
            "FLAG-MIGRATION",
            "enable",
            "disabled",
            "enabled",
            "Migration verification",
            "2026-09-01T00:10:00.000Z"
          )
      ).not.toThrow();
    } finally {
      migratedDatabase.close();
      if (existsSync(databasePath)) {
        unlinkSync(databasePath);
      }
    }
  });
});
