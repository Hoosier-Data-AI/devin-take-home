import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  FeatureFlagEnvironment,
  KycStatus,
  RefundStatus,
  RiskLevel
} from "./domain.js";

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

  CREATE TABLE IF NOT EXISTS refund_requests (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL CHECK (currency = 'USD'),
    category TEXT NOT NULL CHECK (
      category IN ('duplicate_charge', 'service_issue', 'fraud_claim')
    ),
    risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    version INTEGER NOT NULL CHECK (version >= 1)
  );

  CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    flag_key TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (
      environment IN ('development', 'staging', 'production')
    ),
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version >= 1)
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (
      entity_type IN ('kyc_case', 'refund_request', 'feature_flag')
    ),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_status TEXT CHECK (
      old_status IS NULL OR old_status IN (
        'pending', 'approved', 'rejected', 'enabled', 'disabled'
      )
    ),
    new_status TEXT NOT NULL CHECK (
      new_status IN ('pending', 'approved', 'rejected', 'enabled', 'disabled')
    ),
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_kyc_cases_queue
    ON kyc_cases(status, risk, submitted_at DESC);

  CREATE INDEX IF NOT EXISTS idx_refund_requests_queue
    ON refund_requests(status, risk, submitted_at DESC);

  CREATE INDEX IF NOT EXISTS idx_feature_flags_queue
    ON feature_flags(environment, enabled, flag_key);

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

interface SeedRefund {
  id: string;
  customerId: string;
  customerName: string;
  amountCents: number;
  currency: "USD";
  category: "duplicate_charge" | "service_issue" | "fraud_claim";
  risk: RiskLevel;
  submittedAt: string;
  status: RefundStatus;
  version: number;
}

interface SeedFeatureFlag {
  id: string;
  key: string;
  description: string;
  owner: string;
  environment: FeatureFlagEnvironment;
  enabled: number;
  updatedAt: string;
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

const seedRefunds: readonly SeedRefund[] = [
  {
    id: "REF-2001",
    customerId: "SYN-CUST-021",
    customerName: "Morgan Sample",
    amountCents: 12900,
    currency: "USD",
    category: "duplicate_charge",
    risk: "low",
    submittedAt: "2026-09-21T13:20:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "REF-2002",
    customerId: "SYN-CUST-022",
    customerName: "Parker Example",
    amountCents: 87500,
    currency: "USD",
    category: "fraud_claim",
    risk: "high",
    submittedAt: "2026-09-21T10:05:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "REF-2003",
    customerId: "SYN-CUST-023",
    customerName: "Quinn Demo",
    amountCents: 4900,
    currency: "USD",
    category: "service_issue",
    risk: "low",
    submittedAt: "2026-09-20T16:45:00.000Z",
    status: "approved",
    version: 2
  },
  {
    id: "REF-2004",
    customerId: "SYN-CUST-024",
    customerName: "Reese Placeholder",
    amountCents: 240000,
    currency: "USD",
    category: "fraud_claim",
    risk: "high",
    submittedAt: "2026-09-20T09:30:00.000Z",
    status: "rejected",
    version: 2
  },
  {
    id: "REF-2005",
    customerId: "SYN-CUST-025",
    customerName: "Sage Fiction",
    amountCents: 18950,
    currency: "USD",
    category: "duplicate_charge",
    risk: "medium",
    submittedAt: "2026-09-19T17:15:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "REF-2006",
    customerId: "SYN-CUST-026",
    customerName: "Taylor Test",
    amountCents: 6150,
    currency: "USD",
    category: "service_issue",
    risk: "low",
    submittedAt: "2026-09-19T12:00:00.000Z",
    status: "approved",
    version: 2
  },
  {
    id: "REF-2007",
    customerId: "SYN-CUST-027",
    customerName: "Val Mock",
    amountCents: 52000,
    currency: "USD",
    category: "duplicate_charge",
    risk: "medium",
    submittedAt: "2026-09-18T15:10:00.000Z",
    status: "pending",
    version: 1
  },
  {
    id: "REF-2008",
    customerId: "SYN-CUST-028",
    customerName: "Winter Sample",
    amountCents: 145000,
    currency: "USD",
    category: "fraud_claim",
    risk: "high",
    submittedAt: "2026-09-17T11:25:00.000Z",
    status: "pending",
    version: 1
  }
];

const seedFeatureFlags: readonly SeedFeatureFlag[] = [
  {
    id: "FLAG-3001",
    key: "checkout.new-risk-screen",
    description: "Use the redesigned synthetic checkout risk screen.",
    owner: "Risk Platform",
    environment: "development",
    enabled: 1,
    updatedAt: "2026-09-21T15:00:00.000Z",
    version: 3
  },
  {
    id: "FLAG-3002",
    key: "refunds.instant-low-value",
    description: "Automatically approve eligible low-value demo refunds.",
    owner: "Payments Operations",
    environment: "staging",
    enabled: 0,
    updatedAt: "2026-09-21T12:30:00.000Z",
    version: 2
  },
  {
    id: "FLAG-3003",
    key: "kyc.document-v2",
    description: "Route synthetic KYC documents through the v2 review UI.",
    owner: "Identity",
    environment: "production",
    enabled: 0,
    updatedAt: "2026-09-20T18:10:00.000Z",
    version: 5
  },
  {
    id: "FLAG-3004",
    key: "ledger.reconciliation-panel",
    description: "Expose the internal reconciliation panel in the sandbox.",
    owner: "Ledger",
    environment: "development",
    enabled: 1,
    updatedAt: "2026-09-20T14:40:00.000Z",
    version: 1
  },
  {
    id: "FLAG-3005",
    key: "support.account-timeline",
    description: "Show the consolidated synthetic account event timeline.",
    owner: "Customer Support",
    environment: "staging",
    enabled: 1,
    updatedAt: "2026-09-19T16:20:00.000Z",
    version: 4
  },
  {
    id: "FLAG-3006",
    key: "transfers.velocity-controls",
    description: "Enable the next version of transfer velocity controls.",
    owner: "Risk Platform",
    environment: "production",
    enabled: 1,
    updatedAt: "2026-09-19T10:15:00.000Z",
    version: 7
  },
  {
    id: "FLAG-3007",
    key: "cards.virtual-card-beta",
    description: "Allow synthetic beta accounts to create virtual cards.",
    owner: "Cards",
    environment: "development",
    enabled: 0,
    updatedAt: "2026-09-18T13:05:00.000Z",
    version: 2
  },
  {
    id: "FLAG-3008",
    key: "notifications.ops-digest",
    description: "Send the simulated daily operations digest.",
    owner: "Platform Experience",
    environment: "staging",
    enabled: 1,
    updatedAt: "2026-09-17T09:35:00.000Z",
    version: 6
  },
  {
    id: "FLAG-3009",
    key: "banking.partner-routing-v3",
    description: "Use the v3 synthetic partner routing strategy.",
    owner: "Banking Platform",
    environment: "production",
    enabled: 0,
    updatedAt: "2026-09-16T17:50:00.000Z",
    version: 3
  }
];

function migrateLegacyAuditEvents(database: WorkbenchDatabase): void {
  const auditTable = database
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'audit_events'"
    )
    .get() as { sql: string } | undefined;

  if (!auditTable || auditTable.sql.includes("'refund_request'")) {
    return;
  }

  database.transaction(() => {
    database.exec(`
      DROP TRIGGER IF EXISTS audit_events_no_update;
      DROP TRIGGER IF EXISTS audit_events_no_delete;
      DROP INDEX IF EXISTS idx_audit_events_entity;
      ALTER TABLE audit_events RENAME TO audit_events_legacy;

      CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (
          entity_type IN ('kyc_case', 'refund_request', 'feature_flag')
        ),
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_status TEXT CHECK (
          old_status IS NULL OR old_status IN (
            'pending', 'approved', 'rejected', 'enabled', 'disabled'
          )
        ),
        new_status TEXT NOT NULL CHECK (
          new_status IN (
            'pending', 'approved', 'rejected', 'enabled', 'disabled'
          )
        ),
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      INSERT INTO audit_events (
        id,
        actor_id,
        entity_type,
        entity_id,
        action,
        old_status,
        new_status,
        reason,
        created_at
      )
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
      FROM audit_events_legacy;

      DROP TABLE audit_events_legacy;

      CREATE INDEX idx_audit_events_entity
        ON audit_events(entity_type, entity_id, created_at DESC);

      CREATE TRIGGER audit_events_no_update
      BEFORE UPDATE ON audit_events
      BEGIN
        SELECT RAISE(ABORT, 'audit events are append-only');
      END;

      CREATE TRIGGER audit_events_no_delete
      BEFORE DELETE ON audit_events
      BEGIN
        SELECT RAISE(ABORT, 'audit events are append-only');
      END;
    `);
  })();
}

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
  migrateLegacyAuditEvents(database);
  return database;
}

function insertKycSeedData(database: WorkbenchDatabase): void {
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

  for (const seedCase of seedCases) {
    insertCase.run(seedCase);
    insertAudit.run(seedCase);
  }
}

function insertRefundSeedData(database: WorkbenchDatabase): void {
  const insertRefund = database.prepare(`
    INSERT INTO refund_requests (
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
    ) VALUES (
      @id,
      @customerId,
      @customerName,
      @amountCents,
      @currency,
      @category,
      @risk,
      @submittedAt,
      @status,
      @version
    )
  `);
  const insertAudit = database.prepare(`
    INSERT INTO audit_events (
      actor_id, entity_type, entity_id, action, old_status, new_status, reason, created_at
    ) VALUES (
      'system-seed', 'refund_request', @id, 'refund.request.seeded', NULL, @status,
      'Synthetic demo seed', @submittedAt
    )
  `);

  for (const seedRefund of seedRefunds) {
    insertRefund.run(seedRefund);
    insertAudit.run(seedRefund);
  }
}

function insertFeatureFlagSeedData(database: WorkbenchDatabase): void {
  const insertFlag = database.prepare(`
    INSERT INTO feature_flags (
      id,
      flag_key,
      description,
      owner,
      environment,
      enabled,
      updated_at,
      version
    ) VALUES (
      @id,
      @key,
      @description,
      @owner,
      @environment,
      @enabled,
      @updatedAt,
      @version
    )
  `);
  const insertAudit = database.prepare(`
    INSERT INTO audit_events (
      actor_id, entity_type, entity_id, action, old_status, new_status, reason, created_at
    ) VALUES (
      'system-seed',
      'feature_flag',
      @id,
      'feature_flag.seeded',
      NULL,
      CASE WHEN @enabled = 1 THEN 'enabled' ELSE 'disabled' END,
      'Synthetic demo seed',
      @updatedAt
    )
  `);

  for (const seedFlag of seedFeatureFlags) {
    insertFlag.run(seedFlag);
    insertAudit.run(seedFlag);
  }
}

function insertSeedData(database: WorkbenchDatabase): void {
  insertKycSeedData(database);
  insertRefundSeedData(database);
  insertFeatureFlagSeedData(database);
}

export function seedDatabase(database: WorkbenchDatabase): void {
  database.transaction(() => insertSeedData(database))();
}

export function seedDatabaseIfEmpty(database: WorkbenchDatabase): boolean {
  return database.transaction(() => {
    let seeded = false;
    const countRows = (table: string): number => {
      const row = database
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .get() as { count: number };
      return row.count;
    };

    if (countRows("kyc_cases") === 0) {
      insertKycSeedData(database);
      seeded = true;
    }
    if (countRows("refund_requests") === 0) {
      insertRefundSeedData(database);
      seeded = true;
    }
    if (countRows("feature_flags") === 0) {
      insertFeatureFlagSeedData(database);
      seeded = true;
    }

    return seeded;
  })();
}

export function resetDatabase(database: WorkbenchDatabase): void {
  database.transaction(() => {
    database.exec("DROP TRIGGER IF EXISTS audit_events_no_delete");
    database.exec("DELETE FROM audit_events");
    database.exec("DELETE FROM feature_flags");
    database.exec("DELETE FROM refund_requests");
    database.exec("DELETE FROM kyc_cases");
    database.exec(`
      CREATE TRIGGER audit_events_no_delete
      BEFORE DELETE ON audit_events
      BEGIN
        SELECT RAISE(ABORT, 'audit events are append-only');
      END;
    `);
    insertSeedData(database);
  })();
}
