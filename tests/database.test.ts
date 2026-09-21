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
