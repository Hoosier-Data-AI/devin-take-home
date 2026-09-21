import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { KycStatus, RiskLevel } from "./domain.js";

export type WorkbenchDatabase = Database.Database;

const schema = `
  CREATE TABLE IF NOT EXISTS kyc_cases (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    version INTEGER NOT NULL CHECK (version >= 1)
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type = 'kyc_case'),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_status TEXT CHECK (old_status IS NULL OR old_status IN ('pending', 'approved', 'rejected')),
    new_status TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'rejected')),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES kyc_cases(id)
  );

  CREATE INDEX IF NOT EXISTS idx_kyc_cases_queue
    ON kyc_cases(status, risk, submitted_at DESC);

  CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON audit_events(entity_type, entity_id, created_at DESC);

  CREATE TRIGGER IF NOT EXISTS audit_events_no_update
  BEFORE UPDATE ON audit_events
  BEGIN
    SELECT RAISE(ABORT, 'audit events are append-only');
  END;

  CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
  BEFORE DELETE ON audit_events
  BEGIN
    SELECT RAISE(ABORT, 'audit events are append-only');
  END;
`;

interface SeedCase {
  id: string;
  customerId: string;
  customerName: string;
  risk: RiskLevel;
  submittedAt: string;
  status: KycStatus;
  version: number;
}

const seedCases: readonly SeedCase[] = [
  {
    id: "KYC-1001",
    customerId: "SYN-CUST-001",
    customerName: "Avery Sample",
    risk: "high",
    submittedAt: "2026-09-20T14:10:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1002",
    customerId: "SYN-CUST-002",
    customerName: "Blake Example",
    risk: "medium",
    submittedAt: "2026-09-20T11:45:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1003",
    customerId: "SYN-CUST-003",
    customerName: "Casey Demo",
    risk: "low",
    submittedAt: "2026-09-19T18:25:00.000Z",
    status: "approved",
    version: 2
  },
  {
    id: "KYC-1004",
    customerId: "SYN-CUST-004",
    customerName: "Drew Placeholder",
    risk: "high",
    submittedAt: "2026-09-19T09:15:00.000Z",
    status: "rejected",
    version: 2
  },
  {
    id: "KYC-1005",
    customerId: "SYN-CUST-005",
    customerName: "Emery Fiction",
    risk: "medium",
    submittedAt: "2026-09-18T16:35:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1006",
    customerId: "SYN-CUST-006",
    customerName: "Finley Test",
    risk: "low",
    submittedAt: "2026-09-18T10:05:00.000Z",
    status: "approved",
    version: 2
  },
  {
    id: "KYC-1007",
    customerId: "SYN-CUST-007",
    customerName: "Gray Mock",
    risk: "high",
    submittedAt: "2026-09-17T13:50:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1008",
    customerId: "SYN-CUST-008",
    customerName: "Harper Sample",
    risk: "medium",
    submittedAt: "2026-09-16T20:20:00.000Z",
    status: "rejected",
    version: 2
  },
  {
    id: "KYC-1009",
    customerId: "SYN-CUST-009",
    customerName: "Indigo Example",
    risk: "low",
    submittedAt: "2026-09-16T12:40:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1010",
    customerId: "SYN-CUST-010",
    customerName: "Jordan Demo",
    risk: "high",
    submittedAt: "2026-09-15T15:30:00.000Z",
    status: "approved",
    version: 2
  },
  {
    id: "KYC-1011",
    customerId: "SYN-CUST-011",
    customerName: "Kai Placeholder",
    risk: "medium",
    submittedAt: "2026-09-14T17:05:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "KYC-1012",
    customerId: "SYN-CUST-012",
    customerName: "Logan Fiction",
    risk: "low",
    submittedAt: "2026-09-13T08:55:00.000Z",
    status: "rejected",
    version: 2
  }
];

export function openDatabase(
  filename = process.env.DB_PATH ?? resolve("data/workbench.sqlite")
): WorkbenchDatabase {
  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }

  const database = new Database(filename);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  if (filename !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }
  database.exec(schema);
  return database;
}

export function seedDatabase(database: WorkbenchDatabase): void {
  const insertCase = database.prepare(`
    INSERT INTO kyc_cases (
      id, customer_id, customer_name, risk, submitted_at, status, version
    ) VALUES (
      @id, @customerId, @customerName, @risk, @submittedAt, @status, @version
    )
  `);
  const insertAudit = database.prepare(`
    INSERT INTO audit_events (
      actor_id, entity_type, entity_id, action, old_status, new_status, reason, created_at
    ) VALUES (
      'system-seed', 'kyc_case', @id, 'kyc.case.seeded', NULL, @status,
      'Synthetic demo seed', @submittedAt
    )
  `);

  database.transaction(() => {
    for (const seedCase of seedCases) {
      insertCase.run(seedCase);
      insertAudit.run(seedCase);
    }
  })();
}

export function seedDatabaseIfEmpty(database: WorkbenchDatabase): boolean {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM kyc_cases")
    .get() as { count: number };

  if (row.count > 0) {
    return false;
  }

  seedDatabase(database);
  return true;
}

export function resetDatabase(database: WorkbenchDatabase): void {
  database.transaction(() => {
    database.exec("DROP TRIGGER IF EXISTS audit_events_no_delete");
    database.exec("DELETE FROM audit_events");
    database.exec("DELETE FROM kyc_cases");
    database.exec(`
      CREATE TRIGGER audit_events_no_delete
      BEFORE DELETE ON audit_events
      BEGIN
        SELECT RAISE(ABORT, 'audit events are append-only');
      END;
    `);
  })();
  seedDatabase(database);
}
