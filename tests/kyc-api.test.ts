import request from "supertest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.js";
import {
  openDatabase,
  seedDatabase,
  type WorkbenchDatabase
} from "../server/database.js";
import { getKycCase } from "../server/kyc-service.js";

const reviewer = "kyc-reviewer-001";
const viewer = "viewer-001";

describe("KYC API", () => {
  let database: WorkbenchDatabase;

  beforeEach(() => {
    database = openDatabase(":memory:");
    seedDatabase(database);
  });

  afterEach(() => {
    database.close();
  });

  it("allows a KYC reviewer to decide a pending case and records the audit event", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    const response = await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "  Identity evidence matched the synthetic record.  ",
        expectedVersion: 1
      })
      .expect(200);

    expect(response.body.case).toMatchObject({
      id: "KYC-1001",
      status: "approved",
      version: 2
    });
    expect(response.body.case.auditEvents[0]).toMatchObject({
      actorId: reviewer,
      entityType: "kyc_case",
      action: "kyc.case.approved",
      oldStatus: "pending",
      newStatus: "approved",
      reason: "Identity evidence matched the synthetic record."
    });
  });

  it("denies a direct decision from the viewer persona", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", viewer)
      .send({
        decision: "approved",
        reason: "Viewer should not be able to decide.",
        expectedVersion: 1
      })
      .expect(403);

    expect(getKycCase(database, "KYC-1001")).toMatchObject({
      status: "pending",
      version: 1
    });
  });

  it("does not trust a forged role in the action payload", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", viewer)
      .send({
        decision: "approved",
        reason: "Forged role must have no effect.",
        expectedVersion: 1,
        role: "kyc_reviewer"
      })
      .expect(403);

    expect(getKycCase(database, "KYC-1001")).toMatchObject({
      status: "pending",
      version: 1
    });
  });

  it("rejects a blank trimmed decision reason", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "rejected",
        reason: "   ",
        expectedVersion: 1
      })
      .expect(400);

    expect(getKycCase(database, "KYC-1001")).toMatchObject({
      status: "pending",
      version: 1
    });
  });

  it("returns conflicts for stale and repeated decisions", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "This request has a stale version.",
        expectedVersion: 99
      })
      .expect(409);

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "First valid decision.",
        expectedVersion: 1
      })
      .expect(200);

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "rejected",
        reason: "Repeated decision must fail.",
        expectedVersion: 1
      })
      .expect(409);

    const storedCase = getKycCase(database, "KYC-1001");
    expect(storedCase).toMatchObject({
      status: "approved",
      version: 2
    });
    expect(storedCase.auditEvents).toHaveLength(2);
  });

  it("rolls back the state change when the audit write fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = createApp({
      database,
      nodeEnv: "test",
      auditWriter: () => {
        throw new Error("Injected audit failure");
      }
    });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "rejected",
        reason: "This must be rolled back.",
        expectedVersion: 1
      })
      .expect(500);

    const storedCase = getKycCase(database, "KYC-1001");
    expect(storedCase).toMatchObject({
      status: "pending",
      version: 1
    });
    expect(storedCase.auditEvents).toHaveLength(1);
    consoleError.mockRestore();
  });

  it("rejects unknown identities and domain-inappropriate readers", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/kyc/cases")
      .set("x-demo-persona-id", "unknown-identity")
      .expect(401);

    await request(app)
      .get("/api/kyc/cases")
      .set("x-demo-persona-id", "refund-reviewer-001")
      .expect(403);
  });

  it("keeps unknown API reads on the JSON 404 contract when serving the client", async () => {
    const clientDirectory = mkdtempSync(join(tmpdir(), "workbench-client-"));
    writeFileSync(
      join(clientDirectory, "index.html"),
      "<!doctype html><title>Test client</title>"
    );
    const app = createApp({
      database,
      nodeEnv: "test",
      clientDirectory
    });

    const response = await request(app)
      .get("/api/unknown")
      .set("accept", "text/html")
      .set("x-demo-persona-id", reviewer)
      .expect("content-type", /json/)
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: "not_found"
    });
    rmSync(clientDirectory, { recursive: true, force: true });
  });
});
